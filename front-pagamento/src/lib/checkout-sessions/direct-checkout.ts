import crypto, { randomUUID } from 'node:crypto'

import { getPool, withTransaction } from '@/lib/db/pool'

import { hashCheckoutSecret } from './api-keys'
import { resolveCheckoutCustomerProfile } from './customer-profile'
import { createPagarmePaymentForOrder } from './gateway-payment'
import { type AuthenticatedApiKey, CheckoutSessionError, isValidRedirectUrl } from './service'
import type { CheckoutCustomerAddress, CheckoutSessionPricingMode } from './types'

const MAX_METADATA_BYTES = 8 * 1024
const MIN_EXPIRES_MINUTES = 15
const MAX_EXPIRES_MINUTES = 1440
const DEFAULT_EXPIRES_MINUTES = 60

export interface CreateDirectCheckoutInput {
  apiKey: AuthenticatedApiKey
  productSlug: string
  pricingMode: CheckoutSessionPricingMode
  priceRef?: string | null
  amountCents?: number | null
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  installments?: number
  customer: {
    email: string
    name?: string | null
    document?: string | null
    emailVerifiedByOrigin?: boolean
    address?: CheckoutCustomerAddress | null
  }
  metadata?: Record<string, unknown> | null
  successUrl?: string | null
  cancelUrl?: string | null
  expiresInMinutes?: number | null
  idempotencyKey?: string | null
  baseUrl: string
}

export interface DirectCheckoutResult {
  sessionId: string
  orderId: string
  paymentId: string | null
  paymentUrl: string | null
  checkoutUrl: string | null
  pixQrCode: string | null
  pixCopyPaste: string | null
  boletoUrl: string | null
  boletoLine: string | null
  amountCents: number
  expiresAt: string
  reused: boolean
}

export async function createDirectCheckout(
  input: CreateDirectCheckoutInput
): Promise<DirectCheckoutResult> {
  if (input.successUrl && !isValidRedirectUrl(input.successUrl)) {
    throw new CheckoutSessionError(400, 'successUrl inválida: apenas HTTPS público é permitido')
  }
  if (input.cancelUrl && !isValidRedirectUrl(input.cancelUrl)) {
    throw new CheckoutSessionError(400, 'cancelUrl inválida: apenas HTTPS público é permitido')
  }

  const expiresInMinutes = input.expiresInMinutes ?? DEFAULT_EXPIRES_MINUTES
  if (
    !Number.isInteger(expiresInMinutes) ||
    expiresInMinutes < MIN_EXPIRES_MINUTES ||
    expiresInMinutes > MAX_EXPIRES_MINUTES
  ) {
    throw new CheckoutSessionError(
      400,
      `expiresInMinutes deve estar entre ${MIN_EXPIRES_MINUTES} e ${MAX_EXPIRES_MINUTES}`
    )
  }

  const metadata = input.metadata ?? {}
  if (Buffer.byteLength(JSON.stringify(metadata), 'utf8') > MAX_METADATA_BYTES) {
    throw new CheckoutSessionError(400, 'metadata excede o limite máximo de 8 KB')
  }

  const pool = getPool()
  const productRes = await pool.query<{
    id: string
    name: string
    ref: string
    active: boolean
    allow_custom_amount: boolean
    min_amount_cents: number
    max_amount_cents: number | null
  }>(
    `SELECT id, name, ref, active, allow_custom_amount, min_amount_cents, max_amount_cents
     FROM payments.products
     WHERE ref = $1
     LIMIT 1`,
    [input.productSlug]
  )

  const product = productRes.rows[0]
  if (!product || !product.active) {
    throw new CheckoutSessionError(404, 'Produto não encontrado ou inativo')
  }

  if (
    input.apiKey.allowedProductIds !== null &&
    !input.apiKey.allowedProductIds.includes(product.id)
  ) {
    throw new CheckoutSessionError(403, 'Chave não autorizada para este produto')
  }

  let resolvedPriceId: string | null = null
  let resolvedAmountCents: number

  if (input.pricingMode === 'custom') {
    if (!product.allow_custom_amount) {
      throw new CheckoutSessionError(422, 'Produto não permite cobrança com valor flexível')
    }
    if (input.amountCents == null || !Number.isInteger(input.amountCents)) {
      throw new CheckoutSessionError(422, 'amountCents inteiro é obrigatório no modo custom')
    }
    if (
      input.amountCents < product.min_amount_cents ||
      (product.max_amount_cents != null && input.amountCents > product.max_amount_cents)
    ) {
      throw new CheckoutSessionError(
        422,
        `amountCents fora dos limites permitidos (${product.min_amount_cents}..${product.max_amount_cents ?? 'sem teto'})`
      )
    }
    resolvedAmountCents = input.amountCents
  } else {
    if (!input.priceRef) {
      throw new CheckoutSessionError(
        400,
        'priceRef é obrigatório no modo catalog para Direct Checkout'
      )
    }
    const priceRes = await pool.query<{
      id: string
      amount: number
      active: boolean
      stock_cap: number | null
      stock_sold: number
    }>(
      `SELECT id, amount, active, stock_cap, stock_sold
       FROM payments.prices
       WHERE product_id = $1 AND ref = $2
       LIMIT 1`,
      [product.id, input.priceRef]
    )
    const price = priceRes.rows[0]
    if (!price || !price.active) {
      throw new CheckoutSessionError(404, 'Preço de catálogo não encontrado ou inativo')
    }
    if (price.stock_cap != null && price.stock_sold >= price.stock_cap) {
      throw new CheckoutSessionError(409, 'Vagas esgotadas para este plano')
    }
    resolvedPriceId = price.id
    resolvedAmountCents = price.amount
  }

  const trimmedIdempotency = input.idempotencyKey?.trim() || null
  if (trimmedIdempotency) {
    const existing = await pool.query<{
      session_id: string
      order_id: string | null
      expires_at: string
      amount_cents: number | null
      payment_id: string | null
      payment_link_url: string | null
      pix_qr_code: string | null
      pix_code: string | null
      boleto_url: string | null
      boleto_line: string | null
    }>(
      `SELECT
         cs.id AS session_id, cs.order_id, cs.expires_at, cs.amount_cents,
         pp.id AS payment_id, pp.payment_link_url, pp.pix_qr_code, pp.pix_code,
         pp.boleto_url, pp.boleto_line
       FROM payments.checkout_sessions cs
       LEFT JOIN payments.pagarme_payments pp ON pp.order_id = cs.order_id
       WHERE cs.api_key_id = $1 AND cs.idempotency_key = $2
       ORDER BY pp.created_at DESC
       LIMIT 1`,
      [input.apiKey.id, trimmedIdempotency]
    )

    const hit = existing.rows[0]
    if (hit && hit.order_id) {
      return {
        sessionId: hit.session_id,
        orderId: hit.order_id,
        paymentId: hit.payment_id,
        paymentUrl: hit.payment_link_url,
        checkoutUrl: hit.payment_link_url,
        pixQrCode: hit.pix_qr_code,
        pixCopyPaste: hit.pix_code,
        boletoUrl: hit.boleto_url,
        boletoLine: hit.boleto_line,
        amountCents: hit.amount_cents ?? resolvedAmountCents,
        expiresAt: hit.expires_at,
        reused: true,
      }
    }
  }

  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashCheckoutSecret(rawToken)
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  const customerEmail = input.customer.email.trim().toLowerCase()

  const created = await withTransaction(async (client) => {
    const profile = await resolveCheckoutCustomerProfile(client, {
      email: customerEmail,
      name: input.customer.name,
      document: input.customer.document,
      address: input.customer.address ?? null,
    })

    const sessionId = randomUUID()
    const orderId = randomUUID()
    const orderMetadata = {
      ...metadata,
      checkoutSessionId: sessionId,
      pricingMode: input.pricingMode,
      directCheckout: true,
    }

    await client.query(
      `INSERT INTO payments.orders (
         id, user_id, product_id, price_id, amount_cents, order_type,
         payment_gateway, payment_method, status, metadata
       ) VALUES ($1, $2, $3, $4, $5, 'one_time', 'pagarme', $6, 'pending', $7::jsonb)`,
      [
        orderId,
        profile.profileId,
        product.id,
        resolvedPriceId,
        resolvedAmountCents,
        input.billingType,
        JSON.stringify(orderMetadata),
      ]
    )

    await client.query(
      `INSERT INTO payments.checkout_sessions (
         id, token_hash, api_key_id, product_id, price_id, pricing_mode, amount_cents,
         customer_email, customer_name, email_verified_by_origin, metadata,
         success_url, cancel_url, status, order_id, idempotency_key, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, 'paying', $14, $15, $16)`,
      [
        sessionId,
        tokenHash,
        input.apiKey.id,
        product.id,
        resolvedPriceId,
        input.pricingMode,
        resolvedAmountCents,
        customerEmail,
        profile.customerName,
        Boolean(input.customer.emailVerifiedByOrigin),
        JSON.stringify(metadata),
        input.successUrl ?? null,
        input.cancelUrl ?? null,
        orderId,
        trimmedIdempotency,
        expiresAt,
      ]
    )

    return { sessionId, orderId, orderMetadata, profile }
  })

  const payment = await createPagarmePaymentForOrder({
    orderId: created.orderId,
    profileId: created.profile.profileId,
    productId: product.id,
    productName: product.name,
    priceId: resolvedPriceId,
    amountCents: resolvedAmountCents,
    metadata: created.orderMetadata,
    customerEmail,
    customerName: created.profile.customerName,
    customerDocument: created.profile.customerDocument,
    personType: created.profile.personType,
    billingType: input.billingType,
    installments: input.installments,
  })

  return {
    sessionId: created.sessionId,
    orderId: created.orderId,
    paymentId: payment.paymentId,
    paymentUrl: payment.paymentUrl,
    checkoutUrl: payment.paymentUrl,
    pixQrCode: null,
    pixCopyPaste: null,
    boletoUrl: null,
    boletoLine: null,
    amountCents: resolvedAmountCents,
    expiresAt,
    reused: false,
  }
}
