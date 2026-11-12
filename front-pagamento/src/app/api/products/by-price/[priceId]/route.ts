import { NextResponse } from 'next/server'

import { isProductsByPriceApiKeyValid } from '@/lib/api/products-by-price-api-key'
import { createApiHandlerWithParams } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'
import { loadPublicProductByPrice } from '@/lib/payments/product/load-public-product-by-price'

/**
 * GET /api/products/by-price/[priceId]
 * Busca produto público por price ID
 * - Opcional: com `PRODUCTS_BY_PRICE_API_KEY` no ambiente, exige `x-api-key` ou `Authorization: Bearer`
 * - Retorna apenas preço ativo e produto ativo
 */
export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ priceId: string }> }) => {
    const { priceId } = await params

    const apiKey = (await loadGatewayConfig()).productsByPriceApiKey
    if (!isProductsByPriceApiKeyValid(request, apiKey)) {
      return apiErrorResponse({
        error: 'Não autorizado',
        code: 'UNAUTHORIZED',
        status: 401,
      })
    }

    const result = await loadPublicProductByPrice(priceId)

    if (!result.ok) {
      const status = result.code === 'BAD_REQUEST' ? 400 : 404
      return apiErrorResponse({
        error: result.error,
        code: result.code === 'BAD_REQUEST' ? 'INVALID_REQUEST' : 'NOT_FOUND',
        status,
      })
    }

    return NextResponse.json({ product: result.product, price_ui: result.price_ui })
  },
  { module: 'products', action: 'get_product_by_price_id' }
)
