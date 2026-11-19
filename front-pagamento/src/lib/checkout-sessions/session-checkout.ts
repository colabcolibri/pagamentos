import { randomUUID } from 'node:crypto'

import { getPool, withTransaction } from '@/lib/db/pool'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'

import { hashCheckoutSecret } from './api-keys'
import { verifySessionEmailProof } from './email-proof'
import { CheckoutSessionError } from './service'
import type { CheckoutSessionPricingMode, CheckoutSessionStatus } from './types'

export interface SessionCheckoutRequestBody {
  checkoutSessionToken: string
  price_id?: string | null
  billing_type?: string
  installments?: number
  email_verification_proof?: string | null
  customer_info: {
    name?: string | null
    email: string
    cpf?: string | null
  }
}

export interface SessionCheckoutResolved {
  sessionId: string
  orderId: string
  productId: string
  productName: string
  priceId: string | null
  amountCents: number
  metadata: Record<string, unknown>
  profileId: string
  customerEmail: string
  customerName: string
  customerDocument: string
  successUrl: string | null
}

export async function resolveAndLockCheckoutSession(
  body: SessionCheckoutRequestBody
): Promise<SessionCheckoutResolved> {
  const tokenHash = hashCheckoutSecret(body.checkoutSessionToken)
  const requestEmail = body.customer_info.email.trim().toLowerCase()
  const requestCpf = (body.customer_info.cpf ?? '').replace(/\D/g, '')
  const requestName = body.customer_info.name?.trim() || requestEmail.split('@')[0]

  return withTransaction(async (client) => {
    const csRes = await client.query<{
      id: string
      product_id: string
      price_id: string | null
      pricing_mode: CheckoutSessionPricingMode
      amount_cents: number | null
      customer_email: string | null
      customer_name: string | null
      email_verified_by_origin: boolean
      metadata: Record<string, unknown> | null
      success_url: string | null
      status: CheckoutSessionStatus
      order_id: string | null
      expires_at: string
      product_name: string
      product_active: boolean
    }>(
      `SELECT
         cs.id, cs.product_id, cs.price_id, cs.pricing_mode, cs.amount_cents,
         cs.customer_email, cs.customer_name, cs.email_verified_by_origin,
         cs.metadata, cs.success_url, cs.status, cs.order_id, cs.expires_at,
         p.name AS product_name, p.active AS product_active
       FROM payments.checkout_sessions cs
       JOIN payments.products p ON p.id = cs.product_id
       WHERE cs.token_hash = $1
       FOR UPDATE OF cs`,
      [tokenHash]
    )

    const cs = csRes.rows[0]
    if (!cs || !cs.product_active) {
      throw new CheckoutSessionError(404, 'Sessão de pagamento não encontrada')
    }

    const expired = new Date(cs.expires_at).getTime() <= Date.now()
    if (
      expired ||
      cs.status === 'completed' ||
      cs.status === 'expired' ||
      cs.status === 'cancelled'
    ) {
      throw new CheckoutSessionError(410, 'Este link de pagamento expirou ou já foi utilizado')
    }

    const emailChanged = Boolean(
      cs.customer_email && requestEmail !== cs.customer_email.toLowerCase()
    )
    const hasCodeProof = verifySessionEmailProof(cs.id, requestEmail, body.email_verification_proof)

    if (!cs.email_verified_by_origin || emailChanged) {
      if (!hasCodeProof) {
        throw new CheckoutSessionError(
          401,
          'Verificação de e-mail por código de 6 dígitos obrigatória para esta sessão'
        )
      }
    }

    let resolvedPriceId: string | null = null
    let resolvedAmountCents: number

    if (cs.pricing_mode === 'custom') {
      if (!cs.amount_cents || cs.amount_cents <= 0) {
        throw new CheckoutSessionError(422, 'Valor da sessão inválido')
      }
      resolvedAmountCents = cs.amount_cents
      resolvedPriceId = null
    } else {
      const targetPriceId = cs.price_id ?? body.price_id ?? null
      if (!targetPriceId) {
        throw new CheckoutSessionError(400, 'Selecione um plano válido')
      }
      const priceRes = await client.query<{
        id: string
        product_id: string
        amount: number
        active: boolean
        stock_cap: number | null
        stock_sold: number
      }>(
        `SELECT id, product_id, amount, active, stock_cap, stock_sold
         FROM payments.prices
         WHERE id = $1
         LIMIT 1`,
        [targetPriceId]
      )
      const price = priceRes.rows[0]
      if (!price || !price.active || price.product_id !== cs.product_id) {
        throw new CheckoutSessionError(422, 'Plano selecionado não pertence a esta sessão')
      }
      if (price.stock_cap != null && price.stock_sold >= price.stock_cap) {
        throw new CheckoutSessionError(409, 'Vagas esgotadas para este plano')
      }
      resolvedPriceId = price.id
      resolvedAmountCents = price.amount
    }

    const profileRes = await client.query<{
      id: string
      name: string | null
      cpf: string | null
    }>(
      `SELECT id, name, cpf
       FROM payments.profiles
       WHERE lower(email) = $1
       LIMIT 1`,
      [requestEmail]
    )

    let profileId: string
    let resolvedCpf: string
    let resolvedName = requestName

    const existingProfile = profileRes.rows[0]
    if (existingProfile) {
      profileId = existingProfile.id
      const existingCpf = (existingProfile.cpf ?? '').replace(/\D/g, '')
      if (existingCpf.length >= 11) {
        // Proteção estrita: nunca sobrescreve CPF já salvo sem prova de código nesta sessão
        resolvedCpf = existingCpf
      } else {
        if (requestCpf.length !== 11) {
          throw new CheckoutSessionError(400, 'Informe um CPF válido com 11 dígitos')
        }
        resolvedCpf = requestCpf
        await client.query(
          `UPDATE payments.profiles SET cpf = $1, updated_at = now() WHERE id = $2`,
          [resolvedCpf, profileId]
        )
      }
      if (!resolvedName && existingProfile.name) {
        resolvedName = existingProfile.name
      }
    } else {
      if (requestCpf.length !== 11) {
        throw new CheckoutSessionError(400, 'Informe um CPF válido com 11 dígitos')
      }
      resolvedCpf = requestCpf
      const newProfile = await client.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name, cpf, person_type)
         VALUES ($1, $2, $3, 'individual')
         RETURNING id`,
        [requestEmail, resolvedName, resolvedCpf]
      )
      profileId = newProfile.rows[0]!.id
    }

    const sessionMetadata: Record<string, unknown> = {
      ...(cs.metadata ?? {}),
      checkoutSessionId: cs.id,
      pricingMode: cs.pricing_mode,
    }

    let orderId = cs.order_id
    if (orderId) {
      const existingOrder = await client.query<{ status: string }>(
        `SELECT status FROM payments.orders WHERE id = $1 LIMIT 1`,
        [orderId]
      )
      if (!existingOrder.rows[0] || existingOrder.rows[0].status !== 'pending') {
        orderId = null
      }
    }

    if (!orderId) {
      orderId = randomUUID()
      await client.query(
        `INSERT INTO payments.orders (
           id, user_id, product_id, price_id, amount_cents, order_type,
           payment_gateway, payment_method, status, metadata
         ) VALUES ($1, $2, $3, $4, $5, 'one_time', 'pagarme', $6, 'pending', $7::jsonb)`,
        [
          orderId,
          profileId,
          cs.product_id,
          resolvedPriceId,
          resolvedAmountCents,
          body.billing_type ?? 'PIX',
          JSON.stringify(sessionMetadata),
        ]
      )
    }

    await client.query(
      `UPDATE payments.checkout_sessions
       SET status = 'paying', order_id = $1, updated_at = now()
       WHERE id = $2`,
      [orderId, cs.id]
    )

    return {
      sessionId: cs.id,
      orderId,
      productId: cs.product_id,
      productName: cs.product_name,
      priceId: resolvedPriceId,
      amountCents: resolvedAmountCents,
      metadata: sessionMetadata,
      profileId,
      customerEmail: requestEmail,
      customerName: resolvedName || cs.customer_name || requestEmail.split('@')[0],
      customerDocument: resolvedCpf,
      successUrl: cs.success_url,
    }
  })
}

export async function createSessionPagarmePayment(body: SessionCheckoutRequestBody) {
  const resolved = await resolveAndLockCheckoutSession(body)
  const config = await loadGatewayConfig()
  if (!config.pagarmeSecretKey) {
    throw new CheckoutSessionError(403, 'Pagar.me não está ativo.')
  }

  const { createPagarmeService } = await import('@quitou/core')
  const pagarmeService = createPagarmeService(config.pagarmeSecretKey, config.pagarmeEnvironment)

  const isCard = body.billing_type === 'CREDIT_CARD'
  const installments = Math.min(12, Math.max(1, body.installments ?? 1))
  const acceptedMethods = isCard ? ['credit_card'] : ['pix', 'boleto']

  const paymentLink = await pagarmeService.createPaymentLink({
    is_building: false,
    name: `${resolved.productName} (${resolved.orderId.slice(0, 8)})`,
    type: 'order',
    payment_settings: {
      accepted_payment_methods: acceptedMethods as Array<'credit_card' | 'pix' | 'boleto'>,
      credit_card_settings: {
        operation_type: 'auth_and_capture',
        installments: Array.from({ length: installments }, (_, idx) => ({
          number: idx + 1,
          total: resolved.amountCents,
        })),
      },
      boleto_settings: {
        due_in: 3,
        instructions: `Pagamento do produto ${resolved.productName}.`,
      },
      pix_settings: {
        expires_in: 72 * 60 * 60,
      },
    },
    cart_settings: {
      items: [
        {
          amount: resolved.amountCents,
          name: resolved.productName,
          default_quantity: 1,
        },
      ],
    },
    customer_settings: {
      customer: {
        name: resolved.customerName,
        email: resolved.customerEmail,
        document: resolved.customerDocument,
        type: 'individual',
      },
    },
    order_code: resolved.orderId,
  })

  const paymentId = randomUUID()
  await getPool().query(
    `INSERT INTO payments.pagarme_payments (
       id, order_id, user_id, product_id, price_id, amount_cents,
       payment_link_id, payment_link_url, payment_method, status, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10::jsonb)`,
    [
      paymentId,
      resolved.orderId,
      resolved.profileId,
      resolved.productId,
      resolved.priceId,
      resolved.amountCents,
      paymentLink.id,
      paymentLink.url,
      body.billing_type ?? 'PIX',
      JSON.stringify(resolved.metadata),
    ]
  )

  return {
    paymentId,
    payment_id: paymentId,
    orderId: resolved.orderId,
    checkoutUrl: paymentLink.url,
    payment_url: paymentLink.url,
    amountCents: resolved.amountCents,
  }
}
