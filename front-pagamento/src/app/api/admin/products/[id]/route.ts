import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { maskSecret } from '@/lib/payments/gateway-config'
import { type Product, productValidators } from '@/lib/payments/product'
import { rejectPrivateWebhookUrl } from '@/lib/payments/product/webhook-url-guard'
import { validateRequest, validateUuidParam } from '@/lib/validators/helpers'

function maskAdminProductWebhookSecret(product: Product | null): Product | null {
  if (!product) return null
  return {
    ...product,
    webhook_secret: maskSecret(product.webhook_secret),
  }
}

/**
 * GET /api/admin/products/[id]
 * Busca um produto por ID
 */
export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const { productService } = createAdminProductServices()
    const product = await productService.getProductById(id)

    return NextResponse.json({ product: maskAdminProductWebhookSecret(product) })
  },
  { module: 'admin', action: 'get_product' }
)

/**
 * PUT /api/admin/products/[id]
 * Atualiza um produto
 */
export const PUT = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { user } = authResult
    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const body = await request.json()
    const validation = validateRequest(productValidators.update, body)
    if (!validation.success) {
      return validation.response
    }

    const rejectedUrl = await rejectPrivateWebhookUrl(validation.data.webhook_url)
    if (rejectedUrl) return rejectedUrl

    const { productService } = createAdminProductServices()
    const product = await productService.updateProduct(id, validation.data, user.id)

    return NextResponse.json({ product: maskAdminProductWebhookSecret(product) })
  },
  { module: 'admin', action: 'update_product' }
)

/**
 * DELETE /api/admin/products/[id]
 * Deleta um produto
 */
export const DELETE = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { user } = authResult
    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const { productService } = createAdminProductServices()
    await productService.deleteProduct(id, user.id)

    return NextResponse.json({ success: true })
  },
  { module: 'admin', action: 'delete_product' }
)
