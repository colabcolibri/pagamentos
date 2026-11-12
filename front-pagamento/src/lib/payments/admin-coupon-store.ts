import 'server-only'

import { getPool } from '@/lib/db/pool'

export type CouponWriteRow = {
  code: string
  discount_type: string
  discount_percent: string | number | null
  discount_amount_cents: number | null
  applies_to: string
  product_id: string | null
  price_id: string | null
  max_redemptions_total: number | null
  max_redemptions_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  description: string | null
  public_show_remaining: boolean
  public_remaining_prefix: string | null
  public_remaining_suffix: string | null
  public_show_valid_until: boolean
  public_valid_until_prefix: string | null
  public_valid_until_suffix: string | null
  public_message_bands: unknown
}

const COUPON_JSON = `
  json_build_object(
    'id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_percent', c.discount_percent,
    'discount_amount_cents', c.discount_amount_cents,
    'applies_to', c.applies_to,
    'product_id', c.product_id,
    'price_id', c.price_id,
    'max_redemptions_total', c.max_redemptions_total,
    'max_redemptions_per_user', c.max_redemptions_per_user,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'active', c.active,
    'description', c.description,
    'public_show_remaining', c.public_show_remaining,
    'public_remaining_prefix', c.public_remaining_prefix,
    'public_remaining_suffix', c.public_remaining_suffix,
    'public_show_valid_until', c.public_show_valid_until,
    'public_valid_until_prefix', c.public_valid_until_prefix,
    'public_valid_until_suffix', c.public_valid_until_suffix,
    'public_message_bands', c.public_message_bands,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'products', (
      SELECT json_build_object('id', p.id, 'name', p.name, 'ref', p.ref)
      FROM payments.products p WHERE p.id = c.product_id
    ),
    'prices', (
      SELECT json_build_object('id', pr.id, 'amount', pr.amount, 'currency', pr.currency)
      FROM payments.prices pr WHERE pr.id = c.price_id
    ),
    'discount_coupon_products', COALESCE((
      SELECT json_agg(json_build_object(
        'product_id', cp.product_id,
        'products', json_build_object('id', p.id, 'name', p.name, 'ref', p.ref)
      ))
      FROM payments.discount_coupon_products cp
      INNER JOIN payments.products p ON p.id = cp.product_id
      WHERE cp.coupon_id = c.id
    ), '[]'::json),
    'discount_coupon_prices', COALESCE((
      SELECT json_agg(json_build_object(
        'price_id', cpp.price_id,
        'prices', json_build_object('id', pr.id, 'amount', pr.amount, 'currency', pr.currency, 'product_id', pr.product_id)
      ))
      FROM payments.discount_coupon_prices cpp
      INNER JOIN payments.prices pr ON pr.id = cpp.price_id
      WHERE cpp.coupon_id = c.id
    ), '[]'::json)
  ) AS coupon
`

export async function assertCouponPriceScope(
  priceIds: string[],
  productIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const unique = [...new Set(priceIds)]
  if (unique.length === 0) return { ok: true }
  const rows = await getPool().query<{ id: string; product_id: string }>(
    'SELECT id, product_id FROM payments.prices WHERE id = ANY($1::uuid[])',
    [unique]
  )
  if (rows.rows.length !== unique.length) {
    return { ok: false, message: 'Um ou mais preços não foram encontrados' }
  }
  if (productIds.length > 0) {
    const allowed = new Set(productIds)
    for (const row of rows.rows) {
      if (!allowed.has(row.product_id)) {
        return {
          ok: false,
          message: 'Cada preço deve pertencer a um dos produtos selecionados no cupom',
        }
      }
    }
  }
  return { ok: true }
}

export async function listAdminCoupons(input: {
  active?: boolean | 'all'
  limit: number
  offset: number
}) {
  const values: unknown[] = []
  let where = ''
  if (input.active !== undefined && input.active !== 'all') {
    values.push(input.active)
    where = `WHERE c.active = $${values.length}`
  }
  const total = await getPool().query<{ total: number }>(
    `SELECT count(*)::int AS total FROM payments.discount_coupons c ${where}`,
    values
  )
  values.push(input.limit, input.offset)
  const rows = await getPool().query<{ coupon: Record<string, unknown> }>(
    `SELECT ${COUPON_JSON}
     FROM payments.discount_coupons c
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  )
  return { coupons: rows.rows.map((row) => row.coupon), total: total.rows[0]?.total ?? 0 }
}

export async function getAdminCoupon(id: string) {
  const rows = await getPool().query<{ coupon: Record<string, unknown> }>(
    `SELECT ${COUPON_JSON} FROM payments.discount_coupons c WHERE c.id = $1`,
    [id]
  )
  return rows.rows[0]?.coupon ?? null
}

function writeValues(row: CouponWriteRow): unknown[] {
  return [
    row.code,
    row.discount_type,
    row.discount_percent == null ? null : Number(row.discount_percent),
    row.discount_amount_cents,
    row.applies_to,
    row.product_id,
    row.price_id,
    row.max_redemptions_total,
    row.max_redemptions_per_user,
    row.starts_at,
    row.ends_at,
    row.active,
    row.description,
    row.public_show_remaining,
    row.public_remaining_prefix,
    row.public_remaining_suffix,
    row.public_show_valid_until,
    row.public_valid_until_prefix,
    row.public_valid_until_suffix,
    JSON.stringify(row.public_message_bands ?? []),
  ]
}

const WRITE_COLUMNS = `
  code, discount_type, discount_percent, discount_amount_cents, applies_to,
  product_id, price_id, max_redemptions_total, max_redemptions_per_user,
  starts_at, ends_at, active, description, public_show_remaining,
  public_remaining_prefix, public_remaining_suffix, public_show_valid_until,
  public_valid_until_prefix, public_valid_until_suffix, public_message_bands
`

export async function insertAdminCoupon(
  row: CouponWriteRow
): Promise<{ id: string } | { conflict: true }> {
  try {
    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO payments.discount_coupons (${WRITE_COLUMNS})
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb)
       RETURNING id`,
      writeValues(row)
    )
    return { id: inserted.rows[0]!.id }
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return { conflict: true }
    throw error
  }
}

export async function updateAdminCoupon(
  id: string,
  row: CouponWriteRow
): Promise<{ id: string } | { conflict: true } | null> {
  try {
    const updated = await getPool().query<{ id: string }>(
      `UPDATE payments.discount_coupons SET
         code = $1, discount_type = $2, discount_percent = $3, discount_amount_cents = $4,
         applies_to = $5, product_id = $6, price_id = $7, max_redemptions_total = $8,
         max_redemptions_per_user = $9, starts_at = $10, ends_at = $11, active = $12,
         description = $13, public_show_remaining = $14, public_remaining_prefix = $15,
         public_remaining_suffix = $16, public_show_valid_until = $17,
         public_valid_until_prefix = $18, public_valid_until_suffix = $19,
         public_message_bands = $20::jsonb
       WHERE id = $21
       RETURNING id`,
      [...writeValues(row), id]
    )
    return updated.rows[0] ?? null
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return { conflict: true }
    throw error
  }
}

export async function syncCouponLinks(couponId: string, productIds: string[], priceIds: string[]) {
  const products = [...new Set(productIds)]
  const prices = [...new Set(priceIds)]
  await getPool().query('DELETE FROM payments.discount_coupon_products WHERE coupon_id = $1', [
    couponId,
  ])
  await getPool().query('DELETE FROM payments.discount_coupon_prices WHERE coupon_id = $1', [
    couponId,
  ])
  for (const productId of products) {
    await getPool().query(
      'INSERT INTO payments.discount_coupon_products (coupon_id, product_id) VALUES ($1, $2)',
      [couponId, productId]
    )
  }
  for (const priceId of prices) {
    await getPool().query(
      'INSERT INTO payments.discount_coupon_prices (coupon_id, price_id) VALUES ($1, $2)',
      [couponId, priceId]
    )
  }
}

export async function deleteAdminCoupon(id: string) {
  await getPool().query('DELETE FROM payments.discount_coupon_products WHERE coupon_id = $1', [id])
  await getPool().query('DELETE FROM payments.discount_coupon_prices WHERE coupon_id = $1', [id])
  await getPool().query('DELETE FROM payments.discount_coupons WHERE id = $1', [id])
}

export async function countCouponRedemptions(id: string): Promise<number> {
  const rows = await getPool().query<{ total: number }>(
    'SELECT count(*)::int AS total FROM payments.coupon_redemptions WHERE coupon_id = $1',
    [id]
  )
  return rows.rows[0]?.total ?? 0
}

export async function setCouponActive(id: string, active: boolean) {
  const rows = await getPool().query(
    'UPDATE payments.discount_coupons SET active = $2 WHERE id = $1 RETURNING *',
    [id, active]
  )
  return rows.rows[0] ?? null
}
