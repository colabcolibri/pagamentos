import type { Json } from '@db/database.types'
import 'server-only'

import { getPool } from '@/lib/db/pool'
import type {
  Price,
  PriceAddonOffer,
  PricePromoTier,
  PriceUpgradePath,
  Product,
} from '@/lib/payments/product/product.types'
import { decryptStoredSecret } from '@/lib/security/secret-box'

type PromoRow = {
  id: string
  price_id: string
  sort_order: number
  discount_percent: number
  ends_at: string | null
  max_units: number | null
  units_sold: number
  applies_to: string
  created_at: string | null
  updated_at: string | null
}

type UpgradeRow = {
  id: string
  from_price_id: string
  to_price_id: string
  sort_order: number
  metadata: Json | null
  created_at: string | null
}

type AddonRow = {
  id: string
  anchor_price_id: string
  addon_price_id: string
  sort_order: number
  metadata: Json | null
  created_at: string | null
}

type PriceRow = {
  id: string
  ref: string
  product_id: string
  amount: number
  currency: string | null
  recurring: boolean | null
  interval: string | null
  interval_count: number | null
  active: boolean | null
  metadata: Json | null
  email_addon: Json | null
  stock_cap: number | null
  stock_sold: number | null
  created_at: string | null
  updated_at: string | null
  promo_tiers: PromoRow[] | null
  upgrade_paths: UpgradeRow[] | null
  addon_offers: AddonRow[] | null
}

type ProductRow = {
  id: string
  ref: string
  name: string
  description: string | null
  active: boolean | null
  payment_methods: Json | null
  refund_policy: Json | null
  email_config: Json | null
  metadata: Json | null
  webhook_url: string | null
  webhook_secret: string | null
  created_at: string | null
  updated_at: string | null
  prices: PriceRow[] | null
}

type AddonPriceRow = {
  id: string
  ref: string
  product_id: string
  amount: number
  currency: string | null
  recurring: boolean | null
  interval: string | null
  interval_count: number | null
  active: boolean | null
  metadata: Json | null
  email_addon: Json | null
  stock_cap: number | null
  stock_sold: number | null
  created_at: string | null
  updated_at: string | null
  product_name: string
  product_description: string | null
}

const PRODUCT_SQL = `
SELECT
  p.id, p.ref, p.name, p.description, p.active, p.payment_methods,
  p.refund_policy, p.email_config, p.webhook_url, p.webhook_secret,
  p.metadata, p.created_at, p.updated_at,
  COALESCE((
    SELECT json_agg(price_row ORDER BY price_row.created_at)
    FROM (
      SELECT
        pr.id, pr.ref, pr.product_id, pr.amount, pr.currency, pr.recurring,
        pr.interval, pr.interval_count, pr.active, pr.metadata, pr.email_addon,
        pr.stock_cap, pr.stock_sold, pr.created_at, pr.updated_at,
        COALESCE((
          SELECT json_agg(tier ORDER BY tier.sort_order)
          FROM (
            SELECT id, price_id, sort_order, discount_percent, ends_at, max_units,
                   units_sold, applies_to, created_at, updated_at
            FROM payments.price_promo_tiers
            WHERE price_id = pr.id
          ) tier
        ), '[]'::json) AS promo_tiers,
        COALESCE((
          SELECT json_agg(upgrade ORDER BY upgrade.sort_order)
          FROM (
            SELECT id, from_price_id, to_price_id, sort_order, metadata, created_at
            FROM payments.price_upgrade_paths
            WHERE from_price_id = pr.id
              AND ($1::boolean OR payments.catalog_price_pair_visible_public(from_price_id, to_price_id))
          ) upgrade
        ), '[]'::json) AS upgrade_paths,
        COALESCE((
          SELECT json_agg(offer ORDER BY offer.sort_order)
          FROM (
            SELECT id, anchor_price_id, addon_price_id, sort_order, metadata, created_at
            FROM payments.price_addon_offers
            WHERE anchor_price_id = pr.id
              AND ($1::boolean OR payments.catalog_price_pair_visible_public(anchor_price_id, addon_price_id))
          ) offer
        ), '[]'::json) AS addon_offers
      FROM payments.prices pr
      WHERE pr.product_id = p.id
        AND ($1::boolean OR pr.active = true)
    ) price_row
  ), '[]'::json) AS prices
FROM payments.products p
`

function appliesTo(value: string): PricePromoTier['applies_to'] {
  if (value === 'avista' || value === 'parcelado') return value
  return 'both'
}

function mapPrice(row: PriceRow): Price {
  return {
    id: row.id,
    ref: row.ref,
    product_id: row.product_id,
    amount: row.amount,
    currency: row.currency || 'BRL',
    recurring: row.recurring ?? false,
    interval: row.interval,
    interval_count: row.interval_count,
    active: row.active ?? true,
    metadata: row.metadata || null,
    email_addon: row.email_addon ?? null,
    stock_cap: row.stock_cap,
    stock_sold: row.stock_sold ?? 0,
    promo_tiers: (row.promo_tiers ?? []).map((tier) => ({
      id: tier.id,
      price_id: tier.price_id,
      sort_order: tier.sort_order,
      discount_percent: tier.discount_percent,
      ends_at: tier.ends_at,
      max_units: tier.max_units,
      units_sold: tier.units_sold,
      applies_to: appliesTo(tier.applies_to),
      created_at: tier.created_at,
      updated_at: tier.updated_at,
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapProducts(
  rows: ProductRow[],
  addons: Map<string, Price>,
  includeWebhook: boolean
): Product[] {
  return rows.map((row) => {
    const prices = (row.prices ?? []).map(mapPrice)
    const byId = new Map(prices.map((price) => [price.id, price]))
    for (const price of prices) {
      const raw = (row.prices ?? []).find((item) => item.id === price.id)
      const upgrades: PriceUpgradePath[] = (raw?.upgrade_paths ?? []).map((upgrade) => ({
        id: upgrade.id,
        from_price_id: upgrade.from_price_id,
        to_price_id: upgrade.to_price_id,
        sort_order: upgrade.sort_order,
        metadata: upgrade.metadata ?? null,
        created_at: upgrade.created_at,
        to_price: byId.get(upgrade.to_price_id) ?? null,
      }))
      const offers: PriceAddonOffer[] = (raw?.addon_offers ?? []).map((offer) => {
        const sameProduct = byId.get(offer.addon_price_id)
        const addonPrice = sameProduct ?? addons.get(offer.addon_price_id) ?? null
        return {
          id: offer.id,
          anchor_price_id: offer.anchor_price_id,
          addon_price_id: offer.addon_price_id,
          sort_order: offer.sort_order,
          metadata: offer.metadata ?? null,
          created_at: offer.created_at,
          addon_price: addonPrice,
        }
      })
      if (upgrades.length > 0) price.upgrade_paths = upgrades
      if (offers.length > 0) price.addon_offers = offers
    }
    return {
      id: row.id,
      name: row.name,
      ref: row.ref,
      description: row.description,
      active: row.active ?? true,
      payment_methods: Array.isArray(row.payment_methods)
        ? (row.payment_methods as string[])
        : null,
      refund_policy: row.refund_policy || null,
      email_config: row.email_config || null,
      webhook_url: includeWebhook ? row.webhook_url : null,
      webhook_secret: includeWebhook ? decryptStoredSecret(row.webhook_secret) : null,
      metadata: row.metadata || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      prices,
    }
  })
}

async function addonPrices(
  rows: ProductRow[],
  includeInactive: boolean
): Promise<Map<string, Price>> {
  const known = new Set(rows.flatMap((row) => (row.prices ?? []).map((price) => price.id)))
  const missing = [
    ...new Set(
      rows.flatMap((row) =>
        (row.prices ?? []).flatMap((price) =>
          (price.addon_offers ?? [])
            .map((offer) => offer.addon_price_id)
            .filter((id) => !known.has(id))
        )
      )
    ),
  ]
  const result = new Map<string, Price>()
  if (missing.length === 0) return result
  const loaded = await getPool().query<AddonPriceRow>(
    `SELECT pr.id, pr.ref, pr.product_id, pr.amount, pr.currency, pr.recurring,
            pr.interval, pr.interval_count, pr.active, pr.metadata, pr.email_addon,
            pr.stock_cap, pr.stock_sold, pr.created_at, pr.updated_at,
            p.name AS product_name, p.description AS product_description
     FROM payments.prices pr
     INNER JOIN payments.products p ON p.id = pr.product_id
     WHERE pr.id = ANY($1::uuid[])
       AND ($2::boolean OR (pr.active = true AND p.active = true))`,
    [missing, includeInactive]
  )
  for (const row of loaded.rows) {
    result.set(row.id, {
      ...mapPrice({ ...row, promo_tiers: [], upgrade_paths: [], addon_offers: [] }),
      product: { name: row.product_name, description: row.product_description },
    })
  }
  return result
}

async function loadWhere(
  includeAdmin: boolean,
  where: string,
  params: unknown[]
): Promise<Product[]> {
  const query = await getPool().query<ProductRow>(`${PRODUCT_SQL} WHERE ${where}`, [
    includeAdmin,
    ...params,
  ])
  return mapProducts(query.rows, await addonPrices(query.rows, includeAdmin), includeAdmin)
}

export async function findPublicProductByRef(ref: string): Promise<Product | null> {
  const [product] = await loadWhere(false, 'p.ref = $2 AND p.active = true', [ref])
  return product ?? null
}

export async function findPublicProductsByRefs(refs: string[]): Promise<Product[]> {
  if (refs.length === 0) return []
  return loadWhere(false, 'p.ref = ANY($2::text[]) AND p.active = true', [refs])
}

export async function findPublicProductById(id: string): Promise<Product | null> {
  const [product] = await loadWhere(false, 'p.id = $2 AND p.active = true', [id])
  return product ?? null
}

export async function findAdminProducts(where: string, params: unknown[]): Promise<Product[]> {
  return loadWhere(true, where, params)
}

export async function findVisiblePriceProductId(priceId: string): Promise<string | null> {
  const found = await getPool().query<{ product_id: string }>(
    `SELECT pr.product_id
     FROM payments.prices pr
     WHERE pr.id = $1
       AND payments.catalog_price_pair_visible_public(pr.id, pr.id)`,
    [priceId]
  )
  return found.rows[0]?.product_id ?? null
}
