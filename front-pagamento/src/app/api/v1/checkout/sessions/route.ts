import { NextResponse } from 'next/server'

import { z } from 'zod'

import {
  CheckoutSessionError,
  authenticateCheckoutApiKey,
  createCheckoutSession,
} from '@/lib/checkout-sessions/service'
import { createApiHandler } from '@/lib/errors'

const createSessionSchema = z.object({
  productSlug: z.string().trim().min(1).max(120),
  pricingMode: z.enum(['catalog', 'custom']).default('catalog'),
  priceRef: z.string().trim().min(1).max(120).nullable().optional(),
  amountCents: z.number().int().positive().nullable().optional(),
  customer: z
    .object({
      email: z.string().trim().email().max(255).nullable().optional(),
      name: z.string().trim().max(150).nullable().optional(),
      emailVerifiedByOrigin: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  successUrl: z.string().trim().max(2048).nullable().optional(),
  cancelUrl: z.string().trim().max(2048).nullable().optional(),
  expiresInMinutes: z.number().int().optional(),
  idempotencyKey: z.string().trim().min(1).max(128).nullable().optional(),
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

    const parsed = createSessionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
        { status: 400 }
      )
    }

    const headerIdempotency = request.headers.get('idempotency-key')?.trim() || null
    try {
      const result = await createCheckoutSession({
        apiKey,
        productSlug: parsed.data.productSlug,
        pricingMode: parsed.data.pricingMode,
        priceRef: parsed.data.priceRef ?? null,
        amountCents: parsed.data.amountCents ?? null,
        customer: parsed.data.customer ?? null,
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
  { module: 'checkout_sessions', action: 'create_session' }
)
