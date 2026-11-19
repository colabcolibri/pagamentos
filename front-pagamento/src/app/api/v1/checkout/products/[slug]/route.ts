import { NextResponse } from 'next/server'

import { authenticateCheckoutApiKey } from '@/lib/checkout-sessions/service'
import { countReservedUnitsByPriceIds } from '@/lib/checkout-sessions/stock-reservation'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors'
import { findPublicProductByRef } from '@/lib/payments/catalog/postgres-catalog'
import { toPublicProduct } from '@/lib/payments/product/product.types'

export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
    const apiKey = await authenticateCheckoutApiKey(request)
    if (!apiKey) {
      return NextResponse.json({ error: 'API key ausente, inválida ou revogada' }, { status: 401 })
    }

    const { slug } = await params
    const product = await findPublicProductByRef(slug)
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Produto não encontrado ou inativo' }, { status: 404 })
    }

    if (apiKey.allowedProductIds !== null && !apiKey.allowedProductIds.includes(product.id)) {
      return NextResponse.json({ error: 'Chave não autorizada para este produto' }, { status: 403 })
    }

    const publicProduct = toPublicProduct(product)
    const priceIds = (publicProduct.prices ?? []).map((p) => p.id)
    const reservedMap = await countReservedUnitsByPriceIds(getPool(), priceIds)

    const enrichedPrices = (publicProduct.prices ?? []).map((price) => {
      const stockReserved = reservedMap.get(price.id) ?? 0
      const stockSold = price.stock_sold ?? 0
      const stockAvailable =
        price.stock_cap != null ? Math.max(0, price.stock_cap - stockSold - stockReserved) : null
      return {
        ...price,
        stock_reserved: stockReserved,
        stock_available: stockAvailable,
      }
    })

    return NextResponse.json(
      {
        product: {
          ...publicProduct,
          prices: enrichedPrices,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  { module: 'checkout_sessions', action: 'mirror_product' }
)
