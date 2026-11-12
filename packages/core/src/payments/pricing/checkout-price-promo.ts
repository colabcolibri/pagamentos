import {
  buildPricePromoOrderMetadata,
  isPriceStockSoldOut,
  normalizePromoAppliesTo,
  resolveActivePricePromo,
  type PricePromoCheckoutFlow,
  type PricePromoTierRow,
} from './price-promo'

/** Linha de preço como vem do PostgREST (getPriceWithProduct com embed). */
export type CheckoutPriceRow = {
  amount: number
  stock_cap?: number | null
  stock_sold?: number | null
  price_promo_tiers?: Array<{
    id: string
    sort_order: number
    discount_percent: number
    ends_at: string | null
    max_units: number | null
    units_sold: number
    applies_to?: string | null
  }> | null
}

export function resolveCheckoutPricePromo(
  priceData: CheckoutPriceRow,
  flow: PricePromoCheckoutFlow
): {
  listCents: number
  catalogListCents: number
  promoMeta: Record<string, unknown>
  stockSoldOut: boolean
} {
  const catalogListCents = priceData.amount
  const rawTiers = priceData.price_promo_tiers
  const tiers: PricePromoTierRow[] | null = rawTiers
    ? rawTiers.map((t) => ({
        ...t,
        applies_to: normalizePromoAppliesTo(t.applies_to ?? undefined),
      }))
    : null
  const promo = resolveActivePricePromo(catalogListCents, tiers, new Date(), flow)
  const stockSoldOut = isPriceStockSoldOut({
    stock_cap: priceData.stock_cap ?? null,
    stock_sold: priceData.stock_sold ?? null,
  })
  return {
    listCents: promo.promoListCents,
    catalogListCents,
    promoMeta: buildPricePromoOrderMetadata({ catalogListCents, promo }),
    stockSoldOut,
  }
}
