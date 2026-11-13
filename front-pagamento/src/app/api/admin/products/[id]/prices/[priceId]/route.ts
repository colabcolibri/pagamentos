import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { priceUpdateSchema } from '@/lib/payments/product/product.validators'
import { validateRequest, validateUuidParam } from '@/lib/validators/helpers'

const updatePriceBodySchema = priceUpdateSchema.omit({ id: true })

/**
 * PUT /api/admin/products/[id]/prices/[priceId]
 * Atualiza um preço existente
 */
export const PUT = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string; priceId: string }> }) => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const { user } = authResult
    const { id: productId, priceId } = await params

    const invalidProductId = validateUuidParam(productId)
    if (invalidProductId) return invalidProductId
    const invalidPriceId = validateUuidParam(priceId)
    if (invalidPriceId) return invalidPriceId

    const body = await request.json()
    const validation = validateRequest(updatePriceBodySchema, body)
    if (!validation.success) return validation.response

    const { productService } = createAdminProductServices()
    const product = await productService.updatePrice(productId, priceId, validation.data, user.id)

    return NextResponse.json({ product })
  },
  { module: 'admin', action: 'update_price' }
)

/**
 * DELETE /api/admin/products/[id]/prices/[priceId]
 * Deleta um preço do produto
 */
export const DELETE = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string; priceId: string }> }) => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const { user } = authResult
    const { id: productId, priceId } = await params

    const invalidProductId = validateUuidParam(productId)
    if (invalidProductId) return invalidProductId
    const invalidPriceId = validateUuidParam(priceId)
    if (invalidPriceId) return invalidPriceId

    const { productService } = createAdminProductServices()
    await productService.deletePrice(productId, priceId, user.id)

    return NextResponse.json({ success: true })
  },
  { module: 'admin', action: 'delete_price' }
)
