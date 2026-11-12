import { resolveCheckoutPricePromo } from '@quitou/core/pricing'

import type { Price } from './types'

export function toCheckoutPriceRow(p: Price) {
  return {
    amount: p.amount,
    stock_cap: p.stock_cap ?? null,
    stock_sold: p.stock_sold ?? 0,
    price_promo_tiers: (p.promo_tiers ?? []).map((t, i) => ({
      id: t.id && t.id.length > 0 ? t.id : `preview-tier-${i}`,
      sort_order: t.sort_order,
      discount_percent: t.discount_percent,
      ends_at: t.ends_at ?? null,
      max_units: t.max_units ?? null,
      units_sold: t.units_sold ?? 0,
      applies_to: t.applies_to ?? 'both',
    })),
  }
}

export function effectiveListAvista(price: Price): number {
  return resolveCheckoutPricePromo(toCheckoutPriceRow(price), 'avista').listCents
}

export function effectiveListParcelado(price: Price): number {
  return resolveCheckoutPricePromo(toCheckoutPriceRow(price), 'parcelado').listCents
}
