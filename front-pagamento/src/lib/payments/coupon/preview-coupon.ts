import {
  evaluateLoadedCheckoutAddons,
  evaluateLoadedCheckoutCoupon,
  normalizeCouponCode,
  parseCashDiscountPercent,
  resolveCheckoutPricePromo,
} from '@quitou/core/pricing'
import 'server-only'

import { getPool } from '@/lib/db/pool'

export type CouponPreviewBody = {
  normalized_code: string
  applies_to: string
  checkout_flow: string
  subtotal_cents: number
  discount_cents: number
  final_cents: number
  discount_type: string
  discount_percent: string | number | null
  discount_amount_cents: number | null
  coupon_public_lines: {
    remaining: string | null
    valid_until: string | null
  }
}

type PriceJoin = {
  id: string
  amount: number
  recurring: boolean | null
  metadata: Record<string, unknown> | null
  stock_cap: number | null
  stock_sold: number | null
  product_id: string
  price_promo_tiers: Array<{
    id: string
    sort_order: number
    discount_percent: number
    ends_at: string | null
    max_units: number | null
    units_sold: number
    applies_to: string | null
  }>
}

export async function previewCheckoutCoupon(input: {
  priceId: string
  flow: 'avista' | 'parcelado'
  couponCode: string
  userId: string
  addonPriceIds: string[]
}): Promise<{ ok: true; body: CouponPreviewBody } | { ok: false; status: number; error: string }> {
  const code = normalizeCouponCode(input.couponCode)
  if (!code) {
    return {
      ok: false,
      status: 400,
      error: 'Cupom inválido ou não aplicável a esta forma de pagamento.',
    }
  }

  const price = await getPool().query<PriceJoin>(
    `SELECT pr.id, pr.amount, pr.recurring, pr.metadata, pr.stock_cap, pr.stock_sold, pr.product_id,
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
     WHERE pr.id = $1
       AND payments.catalog_price_pair_visible_public(pr.id, pr.id)`,
    [input.priceId]
  )
  const row = price.rows[0]
  if (!row) return { ok: false, status: 404, error: 'Preço não encontrado' }

  const metadata = row.metadata ?? {}
  const { listCents, stockSoldOut } = resolveCheckoutPricePromo(
    { ...row, price_promo_tiers: row.price_promo_tiers },
    input.flow
  )
  if (stockSoldOut) return { ok: false, status: 409, error: 'Este plano está esgotado.' }

  const offers = await getPool().query<{ addon_price_id: string }>(
    `SELECT addon_price_id
     FROM payments.price_addon_offers
     WHERE anchor_price_id = $1
       AND payments.catalog_price_pair_visible_public(anchor_price_id, addon_price_id)`,
    [input.priceId]
  )
  const requested = [...new Set(input.addonPriceIds.filter(Boolean))]
  const addons = requested.length
    ? await getPool().query<{
        id: string
        ref: string
        amount: number
        metadata: Record<string, unknown> | null
        recurring: boolean | null
        stock_cap: number | null
        stock_sold: number | null
        product_name: string | null
      }>(
        `SELECT pr.id, pr.ref, pr.amount, pr.metadata, pr.recurring, pr.stock_cap, pr.stock_sold,
                p.name AS product_name
         FROM payments.prices pr
         INNER JOIN payments.products p ON p.id = pr.product_id
         WHERE pr.id = ANY($1::uuid[])
           AND pr.active = true
           AND p.active = true`,
        [requested]
      )
    : { rows: [] }

  const addonResult = evaluateLoadedCheckoutAddons({
    mainPriceRecurring: !!row.recurring,
    requestedAddonPriceIds: input.addonPriceIds,
    allowedAddonPriceIds: offers.rows.map((offer) => offer.addon_price_id),
    prices: addons.rows.map((addon) => ({
      id: addon.id,
      ref: addon.ref,
      amount: addon.amount,
      metadata: addon.metadata,
      recurring: addon.recurring,
      stock_cap: addon.stock_cap,
      stock_sold: addon.stock_sold,
      products: { name: addon.product_name },
    })),
  })
  if (!addonResult.ok) return { ok: false, status: 400, error: addonResult.error }

  const catalogMainCents = typeof row.amount === 'number' ? row.amount : listCents
  const coupon = await getPool().query<{
    id: string
    code: string
    discount_type: 'percent' | 'fixed_cents'
    discount_percent: string | number | null
    discount_amount_cents: number | null
    applies_to: 'avista' | 'parcelado' | 'both'
    product_id: string | null
    price_id: string | null
    max_redemptions_total: number | null
    max_redemptions_per_user: number | null
    starts_at: string | null
    ends_at: string | null
    active: boolean | null
    public_show_remaining: boolean | null
    public_remaining_prefix: string | null
    public_remaining_suffix: string | null
    public_show_valid_until: boolean | null
    public_valid_until_prefix: string | null
    public_valid_until_suffix: string | null
    public_message_bands: unknown
    product_ids: string[] | null
    price_ids: string[] | null
    used_total: number
    used_by_user: number
  }>(
    `SELECT c.*,
            (SELECT json_agg(cp.product_id) FROM payments.discount_coupon_products cp WHERE cp.coupon_id = c.id) AS product_ids,
            (SELECT json_agg(cpp.price_id) FROM payments.discount_coupon_prices cpp WHERE cpp.coupon_id = c.id) AS price_ids,
            (SELECT count(*)::int FROM payments.coupon_redemptions r WHERE r.coupon_id = c.id) AS used_total,
            (SELECT count(*)::int FROM payments.coupon_redemptions r WHERE r.coupon_id = c.id AND r.user_id = $2) AS used_by_user
     FROM payments.discount_coupons c
     WHERE upper(trim(c.code)) = $1`,
    [code, input.userId]
  )
  const couponRow = coupon.rows[0]
  const result = evaluateLoadedCheckoutCoupon(
    couponRow
      ? {
          ...couponRow,
          discount_coupon_products: (couponRow.product_ids ?? []).map((product_id) => ({
            product_id,
          })),
          discount_coupon_prices: (couponRow.price_ids ?? []).map((price_id) => ({ price_id })),
        }
      : null,
    { total: couponRow?.used_total ?? 0, byUser: couponRow?.used_by_user ?? 0 },
    {
      productId: row.product_id,
      priceId: row.id,
      flow: input.flow,
      listAmountCents: listCents + addonResult.totalAddonListCents,
      cashDiscountPercent: parseCashDiscountPercent(metadata),
      catalogAmountCents: catalogMainCents + addonResult.totalAddonCatalogCents,
    }
  )
  if (!result.ok) return { ok: false, status: 400, error: result.error }

  const data = result.data
  return {
    ok: true,
    body: {
      normalized_code: data.code,
      applies_to: data.appliesTo,
      checkout_flow: data.flow,
      subtotal_cents: data.subtotalCents,
      discount_cents: data.discountCents,
      final_cents: data.finalCents,
      discount_type: data.couponRow.discount_type,
      discount_percent: data.couponRow.discount_percent,
      discount_amount_cents: data.couponRow.discount_amount_cents,
      coupon_public_lines: {
        remaining: data.couponPublicLines.remaining,
        valid_until: data.couponPublicLines.validUntil,
      },
    },
  }
}
