import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { maskSecret } from '@/lib/payments/gateway-config'
import { type Product, productValidators } from '@/lib/payments/product'
import { rejectPrivateWebhookUrl } from '@/lib/payments/product/webhook-url-guard'
import { validateQuery, validateRequest } from '@/lib/validators/helpers'

function maskAdminProductWebhookSecret(product: Product): Product {
  return {
    ...product,
    webhook_secret: maskSecret(product.webhook_secret),
  }
}

/**
 * POST /api/admin/products
 * Cria novo produto (opcionalmente com preços)
 */
export const POST = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { user } = authResult

    const body = await request.json()
    const validation = validateRequest(productValidators.create, body)
    if (!validation.success) {
      return validation.response
    }

    const rejectedUrl = await rejectPrivateWebhookUrl(validation.data.webhook_url)
    if (rejectedUrl) return rejectedUrl

    const { prices, ...productData } = validation.data
    const { productService } = createAdminProductServices()
    const product = await productService.createProductWithPrices(
      {
        ...productData,
        payment_methods: productData.payment_methods ?? undefined,
      },
      prices ?? [],
      user.id
    )

    return NextResponse.json({ product: maskAdminProductWebhookSecret(product) })
  },
  { module: 'admin', action: 'create_product' }
)

/**
 * GET /api/admin/products
 * Lista produtos
 */
export const GET = createApiHandler(
  async (request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    // Validar query params
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(productValidators.get, searchParams)
    if (!validation.success) {
      return validation.response
    }

    const { active } = validation.data

    // Buscar produtos usando service
    const { productService } = createAdminProductServices()
    const products = await productService.getAllProducts({
      active: active,
    })

    return NextResponse.json({ products: products.map(maskAdminProductWebhookSecret) })
  },
  { module: 'admin', action: 'list_products' }
)
