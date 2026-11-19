import crypto from 'node:crypto'

import { getPool } from '@/lib/db/pool'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'
import { timingSafeStringEqual } from '@/lib/security/timing-safe-string-equal'

import { hashCheckoutSecret } from './api-keys'
import type { CheckoutSessionPricingMode } from './types'

const MAX_METADATA_BYTES = 8 * 1024
const MIN_EXPIRES_MINUTES = 15
const MAX_EXPIRES_MINUTES = 1440
const DEFAULT_EXPIRES_MINUTES = 60

export type AuthenticatedApiKey = {
  id: string
  label: string
  allowedProductIds: string[] | null
}

export class CheckoutSessionError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export function extractApiKey(request: Request): string | null {
  const xApiKey = request.headers.get('x-api-key')?.trim()
  if (xApiKey) return xApiKey
  const auth = request.headers.get('authorization')?.trim()
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    return token || null
  }
  return null
}

export async function authenticateCheckoutApiKey(
  request: Request
): Promise<AuthenticatedApiKey | null> {
  const rawKey = extractApiKey(request)
  if (!rawKey) return null

  const keyHash = hashCheckoutSecret(rawKey)
  const pool = getPool()
  const res = await pool.query<{
    id: string
    label: string
    key_hash: string
    allowed_product_ids: string[] | null
  }>(
    `SELECT id, label, key_hash, allowed_product_ids
     FROM payments.checkout_api_keys
     WHERE key_hash = $1
       AND revoked_at IS NULL
     LIMIT 1`,
    [keyHash]
  )

  const row = res.rows[0]
  if (!row || !timingSafeStringEqual(row.key_hash, keyHash)) {
    return null
  }

  await pool
    .query(`UPDATE payments.checkout_api_keys SET last_used_at = now() WHERE id = $1`, [row.id])
    .catch(() => {})

  return {
    id: row.id,
    label: row.label,
    allowedProductIds: row.allowed_product_ids ?? null,
  }
}

export function isValidRedirectUrl(urlString: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return false
  }
  const allowLocalDev =
    process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_CHECKOUT_REDIRECT === '1'
  if (allowLocalDev && parsed.protocol === 'http:' && parsed.hostname === 'localhost') {
    return true
  }
  if (parsed.protocol !== 'https:') {
    return false
  }
  return isUrlSafeForServerSideFetch(urlString)
}

export interface CreateCheckoutSessionInput {
  apiKey: AuthenticatedApiKey
  productSlug: string
  pricingMode: CheckoutSessionPricingMode
  priceRef?: string | null
  amountCents?: number | null
  customer?: {
    email?: string | null
    name?: string | null
    emailVerifiedByOrigin?: boolean
  } | null
  metadata?: Record<string, unknown> | null
  successUrl?: string | null
  cancelUrl?: string | null
  expiresInMinutes?: number | null
  idempotencyKey?: string | null
  baseUrl: string
}

export interface CreateCheckoutSessionResult {
  sessionId: string
  checkoutUrl: string | null
  reused: boolean
  expiresAt: string
  pricingMode: CheckoutSessionPricingMode
  amountCents: number | null
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CreateCheckoutSessionResult> {
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
    ref: string
    active: boolean
    allow_custom_amount: boolean
    min_amount_cents: number
    max_amount_cents: number | null
  }>(
    `SELECT id, ref, active, allow_custom_amount, min_amount_cents, max_amount_cents
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
  let resolvedAmountCents: number | null = null

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
    if (input.priceRef) {
      const priceRes = await pool.query<{ id: string; active: boolean }>(
        `SELECT id, active
         FROM payments.prices
         WHERE product_id = $1 AND ref = $2
         LIMIT 1`,
        [product.id, input.priceRef]
      )
      const price = priceRes.rows[0]
      if (!price || !price.active) {
        throw new CheckoutSessionError(404, 'Preço de catálogo não encontrado ou inativo')
      }
      resolvedPriceId = price.id
    }
  }

  const trimmedIdempotency = input.idempotencyKey?.trim() || null
  if (trimmedIdempotency) {
    const existing = await pool.query<{
      id: string
      expires_at: string
      pricing_mode: CheckoutSessionPricingMode
      amount_cents: number | null
    }>(
      `SELECT id, expires_at, pricing_mode, amount_cents
       FROM payments.checkout_sessions
       WHERE api_key_id = $1 AND idempotency_key = $2
       LIMIT 1`,
      [input.apiKey.id, trimmedIdempotency]
    )
    if (existing.rows[0]) {
      const row = existing.rows[0]
      return {
        sessionId: row.id,
        checkoutUrl: null,
        reused: true,
        expiresAt: row.expires_at,
        pricingMode: row.pricing_mode,
        amountCents: row.amount_cents,
      }
    }
  }

  const rawToken = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashCheckoutSecret(rawToken)
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  const customerEmail = input.customer?.email?.trim().toLowerCase() || null
  const customerName = input.customer?.name?.trim() || null
  const emailVerifiedByOrigin = Boolean(customerEmail && input.customer?.emailVerifiedByOrigin)

  const inserted = await pool.query<{
    id: string
    expires_at: string
    pricing_mode: CheckoutSessionPricingMode
    amount_cents: number | null
  }>(
    `INSERT INTO payments.checkout_sessions (
       token_hash, api_key_id, product_id, price_id, pricing_mode, amount_cents,
       customer_email, customer_name, email_verified_by_origin, metadata,
       success_url, cancel_url, idempotency_key, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)
     RETURNING id, expires_at, pricing_mode, amount_cents`,
    [
      tokenHash,
      input.apiKey.id,
      product.id,
      resolvedPriceId,
      input.pricingMode,
      resolvedAmountCents,
      customerEmail,
      customerName,
      emailVerifiedByOrigin,
      JSON.stringify(metadata),
      input.successUrl ?? null,
      input.cancelUrl ?? null,
      trimmedIdempotency,
      expiresAt,
    ]
  )

  const row = inserted.rows[0]!
  const cleanBase = input.baseUrl.replace(/\/+$/, '')

  return {
    sessionId: row.id,
    checkoutUrl: `${cleanBase}/pagar/${rawToken}`,
    reused: false,
    expiresAt: row.expires_at,
    pricingMode: row.pricing_mode,
    amountCents: row.amount_cents,
  }
}
