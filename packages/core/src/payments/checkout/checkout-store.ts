import {
  evaluateLoadedCheckoutCoupon,
  normalizeCouponCode,
  type DiscountCouponRowWithScope,
} from '../coupon/discount-coupon.service'
import { evaluateLoadedCheckoutAddons } from '../pricing/checkout-addon-prices'

export type SqlRow = Record<string, unknown>

export type SqlClient = {
  query<T extends SqlRow = SqlRow>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
}

export type CheckoutDatabase = SqlClient & {
  transaction<T>(fn: (client: SqlClient) => Promise<T>): Promise<T>
}

export type CheckoutSession = {
  userId: string
  email: string
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function insertRow(
  client: SqlClient,
  table: string,
  row: Record<string, unknown>
): Promise<void> {
  if (!IDENTIFIER.test(table)) {
    throw new Error('Tabela inválida')
  }
  const columns = Object.keys(row)
  for (const column of columns) {
    if (!IDENTIFIER.test(column)) throw new Error('Coluna inválida')
  }
  const params = columns.map((_, index) => `$${index + 1}`)
  await client.query(
    `INSERT INTO payments.${table} (${columns.join(', ')}) VALUES (${params.join(', ')})`,
    columns.map((column) => row[column])
  )
}

export async function loadCheckoutPrice(
  db: SqlClient,
  priceId: string
): Promise<{ price: SqlRow | null; product: SqlRow | null; error?: { message: string } }> {
  const result = await db.query(
    `SELECT pr.id, pr.ref, pr.amount, pr.currency, pr.recurring, pr.interval, pr.interval_count,
            pr.metadata, pr.product_id, pr.stock_cap, pr.stock_sold,
            json_build_object(
              'id', p.id, 'ref', p.ref, 'name', p.name, 'description', p.description,
              'refund_policy', p.refund_policy, 'metadata', p.metadata
            ) AS products,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', t.id,
                'sort_order', t.sort_order,
                'discount_percent', t.discount_percent,
                'ends_at', t.ends_at,
                'max_units', t.max_units,
                'units_sold', t.units_sold,
                'applies_to', t.applies_to
              ) ORDER BY t.sort_order)
              FROM payments.price_promo_tiers t
              WHERE t.price_id = pr.id
            ), '[]'::json) AS price_promo_tiers
     FROM payments.prices pr
     INNER JOIN payments.products p ON p.id = pr.product_id
     WHERE pr.active IS TRUE
       AND (pr.ref = $1 OR pr.id::text = $1)
     LIMIT 1`,
    [priceId]
  )
  const row = result.rows[0]
  if (!row) {
    return { price: null, product: null, error: { message: 'Preço não encontrado' } }
  }
  const product = row.products
  if (!product || typeof product !== 'object') {
    return { price: row, product: null, error: { message: 'Produto não encontrado' } }
  }
  return {
    price: {
      ...row,
      amount: asNumber(row.amount),
      stock_cap: row.stock_cap == null ? null : asNumber(row.stock_cap),
      stock_sold: row.stock_sold == null ? null : asNumber(row.stock_sold),
    },
    product: product as SqlRow,
  }
}

export async function loadCheckoutAddons(
  db: SqlClient,
  params: {
    anchorPriceId: string
    mainPriceRecurring: boolean
    requestedAddonPriceIds: string[]
    flow: 'avista' | 'parcelado'
  }
) {
  const unique = [...new Set(params.requestedAddonPriceIds.filter(Boolean))]
  if (unique.length === 0) {
    return evaluateLoadedCheckoutAddons({
      mainPriceRecurring: params.mainPriceRecurring,
      requestedAddonPriceIds: [],
      allowedAddonPriceIds: [],
      prices: [],
    })
  }

  const offers = await db.query<{ addon_price_id: string }>(
    `SELECT addon_price_id
     FROM payments.price_addon_offers
     WHERE anchor_price_id::text = $1`,
    [params.anchorPriceId]
  )
  const prices = await db.query(
    `SELECT pr.id, pr.ref, pr.amount, pr.metadata, pr.recurring, pr.stock_cap, pr.stock_sold,
            json_build_object('name', p.name) AS products
     FROM payments.prices pr
     INNER JOIN payments.products p ON p.id = pr.product_id
     WHERE pr.active IS TRUE
       AND pr.id::text = ANY($1::text[])`,
    [unique]
  )
  return evaluateLoadedCheckoutAddons({
    mainPriceRecurring: params.mainPriceRecurring,
    requestedAddonPriceIds: params.requestedAddonPriceIds,
    allowedAddonPriceIds: offers.rows.map((row) => row.addon_price_id),
    prices: prices.rows.map((row) => ({
      ...row,
      amount: asNumber(row.amount),
    })) as never,
  })
}

export async function loadCheckoutCoupon(
  db: SqlClient,
  params: {
    couponCode: string
    userId: string
    productId: string
    priceId: string
    flow: 'avista' | 'parcelado'
    listAmountCents: number
    cashDiscountPercent: number
    catalogAmountCents?: number
  }
) {
  const code = normalizeCouponCode(params.couponCode)
  if (!code) {
    return { ok: false as const, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }
  const found = await db.query(
    `SELECT c.*,
            COALESCE((
              SELECT json_agg(json_build_object('product_id', cp.product_id))
              FROM payments.discount_coupon_products cp
              WHERE cp.coupon_id = c.id
            ), '[]'::json) AS discount_coupon_products,
            COALESCE((
              SELECT json_agg(json_build_object('price_id', cpp.price_id))
              FROM payments.discount_coupon_prices cpp
              WHERE cpp.coupon_id = c.id
            ), '[]'::json) AS discount_coupon_prices
     FROM payments.discount_coupons c
     WHERE upper(trim(c.code)) = $1
     LIMIT 1`,
    [code]
  )
  const coupon = (found.rows[0] as DiscountCouponRowWithScope | undefined) ?? null
  const redemptions = { total: 0, byUser: 0 }
  if (coupon?.max_redemptions_total != null) {
    const total = await db.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM payments.coupon_redemptions cr
       LEFT JOIN payments.orders o ON o.id = cr.order_id
       WHERE cr.coupon_id = $1
         AND (
           o.id IS NULL
           OR (
             o.deleted_at IS NULL
             AND o.status NOT IN ('cancelled', 'failed', 'expired')
             AND (o.expires_at IS NULL OR o.expires_at > now())
           )
         )`,
      [coupon.id]
    )
    redemptions.total = total.rows[0]?.total ?? 0
  }
  if (coupon?.max_redemptions_per_user != null) {
    const byUser = await db.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM payments.coupon_redemptions cr
       LEFT JOIN payments.orders o ON o.id = cr.order_id
       WHERE cr.coupon_id = $1
         AND cr.user_id = $2
         AND (
           o.id IS NULL
           OR (
             o.deleted_at IS NULL
             AND o.status NOT IN ('cancelled', 'failed', 'expired')
             AND (o.expires_at IS NULL OR o.expires_at > now())
           )
         )`,
      [coupon.id, params.userId]
    )
    redemptions.byUser = byUser.rows[0]?.total ?? 0
  }
  return evaluateLoadedCheckoutCoupon(coupon, redemptions, params)
}

export type ReusableAsaasPayment = {
  id: string
  invoice_url: string | null
  asaas_checkout_id: string | null
  subscription_id: string | null
  order_id: string | null
  orders: { id: string; deleted_at: string | null; expires_at: string | null } | null
}

export async function findReusableAsaasPayment(
  db: SqlClient,
  filter: {
    userId: string
    priceId: string
    productId: string
    billingType: string
    installments: number
    createdAfter: string
  }
): Promise<ReusableAsaasPayment | null> {
  const result = await db.query(
    `SELECT pay.id, pay.invoice_url, pay.asaas_checkout_id, pay.subscription_id, pay.order_id,
            o.deleted_at, o.expires_at
     FROM payments.asaas_payments pay
     LEFT JOIN payments.orders o ON o.id = pay.order_id
     WHERE pay.user_id = $1
       AND pay.price_id::text = $2
       AND pay.product_id = $3
       AND pay.status = 'pending'
       AND pay.billing_type = $4
       AND pay.installments = $5
       AND pay.created_at >= $6
     ORDER BY pay.created_at DESC
     LIMIT 1`,
    [
      filter.userId,
      filter.priceId,
      filter.productId,
      filter.billingType,
      filter.installments,
      filter.createdAfter,
    ]
  )
  const row = result.rows[0]
  if (!row) return null
  const orderId = (row.order_id as string | null) ?? null
  return {
    id: String(row.id),
    invoice_url: (row.invoice_url as string | null) ?? null,
    asaas_checkout_id: (row.asaas_checkout_id as string | null) ?? null,
    subscription_id: (row.subscription_id as string | null) ?? null,
    order_id: orderId,
    orders: orderId
      ? {
          id: orderId,
          deleted_at: (row.deleted_at as string | null) ?? null,
          expires_at: (row.expires_at as string | null) ?? null,
        }
      : null,
  }
}

export async function findReusablePagarmePayment(db: SqlClient, userId: string, productId: string) {
  const result = await db.query(
    `SELECT pay.id, pay.payment_link_url, pay.expires_at, pay.status, pay.order_id, o.deleted_at
     FROM payments.pagarme_payments pay
     LEFT JOIN payments.orders o ON o.id = pay.order_id
     WHERE pay.user_id = $1
       AND pay.product_id = $2
       AND pay.status IN ('pending', 'incomplete')
     ORDER BY pay.created_at DESC
     LIMIT 1`,
    [userId, productId]
  )
  const row = result.rows[0]
  if (!row) return { existingPayment: null, shouldReuse: false }
  if (row.order_id && row.deleted_at) {
    return { existingPayment: null, shouldReuse: false }
  }
  if (row.expires_at && new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { existingPayment: null, shouldReuse: false }
  }
  return { existingPayment: row, shouldReuse: true }
}

export async function touchCheckoutProfile(
  db: SqlClient,
  userId: string,
  data: { name?: string | null; phone?: string | null; document?: string | null; personType?: string | null }
): Promise<{ profile: SqlRow | null; error?: Error }> {
  const personType = data.personType === 'juridica' || data.personType === 'company' ? 'company' : 'individual'
  const result = await db.query(
    `UPDATE payments.profiles
     SET name = COALESCE(NULLIF($2, ''), name),
         phone = COALESCE($3, phone),
         document = COALESCE($4, document),
         person_type = $5
     WHERE id = $1
     RETURNING id, email, name`,
    [userId, data.name ?? '', data.phone ?? null, data.document ?? null, personType]
  )
  const profile = result.rows[0] ?? null
  if (!profile) {
    return { profile: null, error: new Error('Perfil não encontrado') }
  }
  return { profile }
}

export async function insertPendingSubscription(
  db: SqlClient,
  userId: string,
  priceId: string,
  productId: string,
  productRef: string,
  subscriptionId: string
): Promise<{ subscriptionId: string; error?: Error }> {
  try {
    await insertRow(db, 'subscriptions', {
      id: subscriptionId,
      user_id: userId,
      price_id: priceId,
      status: 'incomplete',
      metadata: { product_id: productId, product_ref: productRef },
    })
    return { subscriptionId }
  } catch (error) {
    return { subscriptionId: '', error: error instanceof Error ? error : new Error('Erro ao criar assinatura') }
  }
}

export async function insertOrderAndPayment(
  db: CheckoutDatabase,
  paymentTable: 'asaas_payments' | 'pagarme_payments',
  order: Record<string, unknown>,
  payment: Record<string, unknown>
): Promise<void> {
  await db.transaction(async (client) => {
    await insertRow(client, 'orders', order)
    await insertRow(client, paymentTable, payment)
  })
}

export async function insertCouponRedemption(
  db: SqlClient | CheckoutDatabase,
  couponId: string,
  orderId: string,
  userId: string
): Promise<void> {
  if ('transaction' in db && typeof db.transaction === 'function') {
    await db.transaction(async (client) => {
      const locked = await client.query<{
        id: string
        max_redemptions_total: number | null
        max_redemptions_per_user: number | null
      }>(
        `SELECT id, max_redemptions_total, max_redemptions_per_user
         FROM payments.discount_coupons
         WHERE id = $1
         FOR UPDATE`,
        [couponId]
      )
      const coupon = locked.rows[0]
      if (coupon?.max_redemptions_total != null) {
        const total = await client.query<{ total: number }>(
          `SELECT count(*)::int AS total
           FROM payments.coupon_redemptions cr
           LEFT JOIN payments.orders o ON o.id = cr.order_id
           WHERE cr.coupon_id = $1
             AND (
               o.id IS NULL
               OR (
                 o.deleted_at IS NULL
                 AND o.status NOT IN ('cancelled', 'failed', 'expired')
                 AND (o.expires_at IS NULL OR o.expires_at > now())
               )
             )`,
          [couponId]
        )
        if ((total.rows[0]?.total ?? 0) >= coupon.max_redemptions_total) {
          throw new Error('Limite de resgates do cupom atingido')
        }
      }
      if (coupon?.max_redemptions_per_user != null) {
        const byUser = await client.query<{ total: number }>(
          `SELECT count(*)::int AS total
           FROM payments.coupon_redemptions cr
           LEFT JOIN payments.orders o ON o.id = cr.order_id
           WHERE cr.coupon_id = $1
             AND cr.user_id = $2
             AND (
               o.id IS NULL
               OR (
                 o.deleted_at IS NULL
                 AND o.status NOT IN ('cancelled', 'failed', 'expired')
                 AND (o.expires_at IS NULL OR o.expires_at > now())
               )
             )`,
          [couponId, userId]
        )
        if ((byUser.rows[0]?.total ?? 0) >= coupon.max_redemptions_per_user) {
          throw new Error('Limite de resgates do cupom por usuário atingido')
        }
      }
      await insertRow(client, 'coupon_redemptions', {
        coupon_id: couponId,
        order_id: orderId,
        user_id: userId,
      })
    })
    return
  }

  await insertRow(db, 'coupon_redemptions', {
    coupon_id: couponId,
    order_id: orderId,
    user_id: userId,
  })
}

export function checkoutDocument(customer: {
  person_type?: string
  cpf?: string
  cnpj?: string
  document?: string
}): string | null {
  if (customer.person_type === 'juridica') return customer.cnpj ?? customer.document ?? null
  return customer.cpf ?? customer.document ?? null
}
