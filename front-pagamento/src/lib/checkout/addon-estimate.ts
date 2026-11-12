import { isPriceStockSoldOut } from '@quitou/core/pricing'

import type { Price } from '@/lib/payments/product'

/** Preço cheio (`amount`); descontos só na cesta (cupom / à vista do plano âncora). */
export function estimateAddonCents(
  addonPrice: Price,
  _flow: 'avista' | 'parcelado'
): number | null {
  if (
    isPriceStockSoldOut({
      stock_cap: addonPrice.stock_cap ?? null,
      stock_sold: addonPrice.stock_sold ?? null,
    })
  ) {
    return null
  }
  const amount = typeof addonPrice.amount === 'number' ? addonPrice.amount : 0
  return amount > 0 ? amount : null
}
