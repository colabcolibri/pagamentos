import { NextResponse } from 'next/server'

import { z } from 'zod'

import { createDirectCheckout } from '@/lib/checkout-sessions/direct-checkout'
import { CheckoutSessionError, authenticateCheckoutApiKey } from '@/lib/checkout-sessions/service'
import { createApiHandler } from '@/lib/errors'

const addressSchema = z.object({
  cep: z.string().trim().min(8).max(12),
  street: z.string().trim().min(2).max(200),
  number: z.string().trim().min(1).max(30),
  complement: z.string().trim().max(100).nullable().optional(),
  neighborhood: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2),
})

const directCheckoutSchema = z
  .object({
    productSlug: z.string().trim().min(1).max(120),
    pricingMode: z.enum(['catalog', 'custom']).default('catalog'),
    priceRef: z.string().trim().min(1).max(120).nullable().optional(),
    amountCents: z.number().int().positive().nullable().optional(),
    billingType: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']).default('PIX'),
    installments: z.number().int().min(1).max(12).optional(),
    customer: z.object({
      email: z.string().trim().email().max(255),
      name: z.string().trim().max(150).nullable().optional(),
      document: z.string().trim().min(11).max(18).nullable().optional(),
      emailVerifiedByOrigin: z.boolean().optional(),
      address: addressSchema.nullable().optional(),
    }),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    successUrl: z.string().trim().max(2048).nullable().optional(),
    cancelUrl: z.string().trim().max(2048).nullable().optional(),
    expiresInMinutes: z.number().int().optional(),
    idempotencyKey: z.string().trim().min(1).max(128).nullable().optional(),
  })
  .refine((data) => data.billingType !== 'BOLETO' || Boolean(data.customer.address), {
    message: 'Endereço completo é obrigatório para pagamentos via BOLETO',
    path: ['customer', 'address'],
  })

function resolvePublicBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (configured) return configured.replace(/\/+$/, '')
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export const POST = createApiHandler(
  async (request: Request) => {
    const apiKey = await authenticateCheckoutApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key ausente, inválida ou revogada' }, { status: 401 })
    }

    const parsed = directCheckoutSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
        { status: 400 }
      )
    }

    const headerIdempotency = request.headers.get('idempotency-key')?.trim() || null
    try {
      const result = await createDirectCheckout({
        apiKey,
        productSlug: parsed.data.productSlug,
        pricingMode: parsed.data.pricingMode,
        priceRef: parsed.data.priceRef ?? null,
        amountCents: parsed.data.amountCents ?? null,
        billingType: parsed.data.billingType,
        installments: parsed.data.installments,
        customer: parsed.data.customer,
        metadata: parsed.data.metadata ?? null,
        successUrl: parsed.data.successUrl ?? null,
        cancelUrl: parsed.data.cancelUrl ?? null,
        expiresInMinutes: parsed.data.expiresInMinutes ?? null,
        idempotencyKey: headerIdempotency ?? parsed.data.idempotencyKey ?? null,
        baseUrl: resolvePublicBaseUrl(request),
      })

      return NextResponse.json(result, { status: result.reused ? 200 : 201 })
    } catch (error) {
      if (error instanceof CheckoutSessionError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  },
  { module: 'checkout_sessions', action: 'direct_checkout' }
)
