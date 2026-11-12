'use server'

import { loadPublicProductByPrice } from '@/lib/payments/product/load-public-product-by-price'

export async function loadCheckoutProductByPriceAction(priceId: string) {
  return loadPublicProductByPrice(priceId)
}
