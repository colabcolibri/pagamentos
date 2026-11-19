import { getPool } from '@/lib/db/pool'

import { hashCheckoutSecret } from './api-keys'
import { countReservedUnitsByPriceIds } from './stock-reservation'
import type { CheckoutSessionPricingMode, CheckoutSessionStatus } from './types'

export interface PublicCheckoutSessionPrice {
  id: string
  ref: string
  amount: number
  currency: string
  recurring: boolean
  interval: string | null
  interval_count: number | null
  metadata: Record<string, unknown> | null
  stock_cap: number | null
  stock_sold: number
  stock_reserved: number
  stock_available: number | null
}

export interface PublicCheckoutSessionDTO {
  sessionId: string
  pricingMode: CheckoutSessionPricingMode
  amountCents: number | null
  product: {
    id: string
    name: string
    slug: string
    description: string | null
    paymentMethods: string[] | null
    refundPolicy: Record<string, unknown> | null
  }
  prices: PublicCheckoutSessionPrice[]
  selectedPriceId: string | null
  customerEmail: string | null
  customerName: string | null
  emailVerifiedByOrigin: boolean
  requiresCpf: boolean
  expiresAt: string
  successUrl: string | null
  cancelUrl: string | null
}

export type PublicCheckoutSessionLookupResult =
  | { ok: true; session: PublicCheckoutSessionDTO }
  | { ok: false; status: 404 | 410; error: string }

export async function getPublicCheckoutSessionByToken(
  token: string
): Promise<PublicCheckoutSessionLookupResult> {
  const tokenHash = hashCheckoutSecret(token)
  const pool = getPool()

  const res = await pool.query<{
    id: string
    pricing_mode: CheckoutSessionPricingMode
    amount_cents: number | null
    price_id: string | null
    customer_email: string | null
    customer_name: string | null
    email_verified_by_origin: boolean
    success_url: string | null
    cancel_url: string | null
    status: CheckoutSessionStatus
    expires_at: string
    product_id: string
    product_name: string
    product_ref: string
    product_description: string | null
    product_active: boolean
    product_payment_methods: string[] | null
    product_refund_policy: Record<string, unknown> | null
  }>(
    `SELECT
       cs.id, cs.pricing_mode, cs.amount_cents, cs.price_id,
       cs.customer_email, cs.customer_name, cs.email_verified_by_origin,
       cs.success_url, cs.cancel_url, cs.status, cs.expires_at,
       p.id AS product_id, p.name AS product_name, p.ref AS product_ref,
       p.description AS product_description, p.active AS product_active,
       p.payment_methods AS product_payment_methods,
       p.refund_policy AS product_refund_policy
     FROM payments.checkout_sessions cs
     JOIN payments.products p ON p.id = cs.product_id
     WHERE cs.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  )

  const row = res.rows[0]
  if (!row || !row.product_active) {
    return { ok: false, status: 404, error: 'Sessão de pagamento não encontrada' }
  }

  const isExpired = new Date(row.expires_at).getTime() <= Date.now()
  if (
    isExpired ||
    row.status === 'completed' ||
    row.status === 'expired' ||
    row.status === 'cancelled'
  ) {
    return { ok: false, status: 410, error: 'Este link de pagamento expirou ou já foi utilizado' }
  }

  let prices: PublicCheckoutSessionPrice[] = []
  if (row.pricing_mode === 'catalog') {
    const pricesRes = await pool.query<{
      id: string
      ref: string
      amount: number
      currency: string | null
      recurring: boolean | null
      interval: string | null
      interval_count: number | null
      metadata: Record<string, unknown> | null
      stock_cap: number | null
      stock_sold: number | null
    }>(
      `SELECT id, ref, amount, currency, recurring, interval, interval_count, metadata, stock_cap, stock_sold
       FROM payments.prices
       WHERE product_id = $1 AND active = true
       ORDER BY created_at ASC`,
      [row.product_id]
    )
    const reservedMap = await countReservedUnitsByPriceIds(
      pool,
      pricesRes.rows.map((p) => p.id)
    )
    prices = pricesRes.rows.map((p) => {
      const stockSold = p.stock_sold ?? 0
      const stockReserved = reservedMap.get(p.id) ?? 0
      const stockAvailable =
        p.stock_cap != null ? Math.max(0, p.stock_cap - stockSold - stockReserved) : null
      return {
        id: p.id,
        ref: p.ref,
        amount: p.amount,
        currency: p.currency || 'BRL',
        recurring: Boolean(p.recurring),
        interval: p.interval,
        interval_count: p.interval_count,
        metadata: p.metadata ?? null,
        stock_cap: p.stock_cap ?? null,
        stock_sold: stockSold,
        stock_reserved: stockReserved,
        stock_available: stockAvailable,
      }
    })
  }

  let requiresCpf = true
  if (row.customer_email) {
    const profileRes = await pool.query<{ has_cpf: boolean }>(
      `SELECT (
         (document IS NOT NULL AND length(trim(document)) >= 11)
         OR (company_document IS NOT NULL AND length(trim(company_document)) >= 14)
       ) AS has_cpf
       FROM payments.profiles
       WHERE lower(email) = $1
       LIMIT 1`,
      [row.customer_email.toLowerCase()]
    )
    requiresCpf = !Boolean(profileRes.rows[0]?.has_cpf)
  }

  return {
    ok: true,
    session: {
      sessionId: row.id,
      pricingMode: row.pricing_mode,
      amountCents: row.amount_cents,
      product: {
        id: row.product_id,
        name: row.product_name,
        slug: row.product_ref,
        description: row.product_description,
        paymentMethods: Array.isArray(row.product_payment_methods)
          ? row.product_payment_methods
          : null,
        refundPolicy: row.product_refund_policy ?? null,
      },
      prices,
      selectedPriceId: row.price_id,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      emailVerifiedByOrigin: Boolean(row.customer_email && row.email_verified_by_origin),
      requiresCpf,
      expiresAt: row.expires_at,
      successUrl: row.success_url,
      cancelUrl: row.cancel_url,
    },
  }
}
