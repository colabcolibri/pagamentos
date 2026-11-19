import { randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db/pool'

import { hashCheckoutSecret } from './api-keys'
import { resolveCheckoutCustomerProfile } from './customer-profile'
import { verifySessionEmailProof } from './email-proof'
import { createPagarmePaymentForOrder } from './gateway-payment'
import { CheckoutSessionError } from './service'
import { assertAndLockCatalogPriceStock } from './stock-reservation'
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
  personType: 'individual' | 'company'
  successUrl: string | null
}

export async function resolveAndLockCheckoutSession(
  body: SessionCheckoutRequestBody
): Promise<SessionCheckoutResolved> {
  const tokenHash = hashCheckoutSecret(body.checkoutSessionToken)
  const requestEmail = body.customer_info.email.trim().toLowerCase()
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
    if (cs.email_verified_by_origin && emailChanged) {
      throw new CheckoutSessionError(403, 'O e-mail desta sessão está travado pela origem')
    }
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
      const price = await assertAndLockCatalogPriceStock(client, {
        priceId: targetPriceId,
        expectedProductId: cs.product_id,
        excludeSessionId: cs.id,
      })
      resolvedPriceId = price.id
      resolvedAmountCents = price.amount
    }

    const profile = await resolveCheckoutCustomerProfile(client, {
      email: requestEmail,
      name: requestName || cs.customer_name,
      document: body.customer_info.cpf,
    })

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
          profile.profileId,
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
      profileId: profile.profileId,
      customerEmail: requestEmail,
      customerName: profile.customerName,
      customerDocument: profile.customerDocument,
      personType: profile.personType,
      successUrl: cs.success_url,
    }
  })
}

export async function createSessionPagarmePayment(body: SessionCheckoutRequestBody) {
  const resolved = await resolveAndLockCheckoutSession(body)
  return createPagarmePaymentForOrder({
    orderId: resolved.orderId,
    profileId: resolved.profileId,
    productId: resolved.productId,
    productName: resolved.productName,
    priceId: resolved.priceId,
    amountCents: resolved.amountCents,
    metadata: resolved.metadata,
    customerEmail: resolved.customerEmail,
    customerName: resolved.customerName,
    customerDocument: resolved.customerDocument,
    personType: resolved.personType,
    billingType: body.billing_type,
    installments: body.installments,
  })
}
