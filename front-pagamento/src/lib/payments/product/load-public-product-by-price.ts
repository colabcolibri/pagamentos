import {
  buildPricePromoPublicDisplay,
  parseCashDiscountPercent,
  parseMaxInstallmentsFromMetadata,
} from '@quitou/core/pricing'

import {
  findPublicProductById,
  findVisiblePriceProductId,
} from '@/lib/payments/catalog/postgres-catalog'
import {
  type Price,
  type Product,
  type PublicProduct,
  toPublicProduct,
} from '@/lib/payments/product/product.types'

export type PricePromoUi = ReturnType<typeof buildPricePromoPublicDisplay>

export type LoadPublicProductByPriceResult =
  | { ok: true; product: PublicProduct; price_ui: PricePromoUi | null }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'BAD_REQUEST' }

/**
 * Mantém só o que o catálogo público pode exibir (preços ativos, upgrades e add-ons válidos).
 */
function sanitizeCatalogProductForCheckout(product: Product): Product {
  const prices = (product.prices ?? [])
    .filter((p) => p.active)
    .map((p) => sanitizePriceNestedCatalog(p))
  return { ...product, prices }
}

function sanitizePriceNestedCatalog(price: Price): Price {
  const upgrade_paths = (price.upgrade_paths ?? []).filter(
    (u) => u.to_price?.id && u.to_price.active !== false
  )
  const addon_offers = (price.addon_offers ?? []).filter(
    (o) => o.addon_price?.id && o.addon_price.active !== false
  )
  const next: Price = { ...price }
  if (upgrade_paths.length > 0) next.upgrade_paths = upgrade_paths
  else delete next.upgrade_paths
  if (addon_offers.length > 0) next.addon_offers = addon_offers
  else delete next.addon_offers
  return next
}

/**
 * Catálogo do checkout por price ID.
 * O par só entra se produto e preço estão ativos.
 */
export async function loadPublicProductByPrice(
  priceId: string
): Promise<LoadPublicProductByPriceResult> {
  if (!priceId?.trim()) {
    return { ok: false, error: 'Price ID é obrigatório', code: 'BAD_REQUEST' }
  }

  const productId = await findVisiblePriceProductId(priceId.trim())
  if (!productId) {
    return { ok: false, error: 'Preço não encontrado', code: 'NOT_FOUND' }
  }

  const product = await findPublicProductById(productId)
  if (!product?.active) {
    return { ok: false, error: 'Produto não encontrado', code: 'NOT_FOUND' }
  }

  const catalogProduct = sanitizeCatalogProductForCheckout(product)
  const selected = catalogProduct.prices?.find((p) => p.id === priceId)
  if (!selected) {
    return { ok: false, error: 'Preço não encontrado', code: 'NOT_FOUND' }
  }

  const priceMeta = (selected.metadata ?? null) as Record<string, unknown> | null
  const price_ui = buildPricePromoPublicDisplay({
    amount: selected.amount,
    stock_cap: selected.stock_cap ?? null,
    stock_sold: selected.stock_sold ?? 0,
    price_promo_tiers: selected.promo_tiers?.map((t) => ({
      id: t.id,
      sort_order: t.sort_order,
      discount_percent: t.discount_percent,
      ends_at: t.ends_at,
      max_units: t.max_units,
      units_sold: t.units_sold,
      applies_to: t.applies_to,
    })),
    cashDiscountPercent: priceMeta ? parseCashDiscountPercent(priceMeta) : 0,
    maxInstallments: priceMeta ? parseMaxInstallmentsFromMetadata(priceMeta) : 1,
  })

  return { ok: true, product: toPublicProduct(catalogProduct), price_ui }
}
