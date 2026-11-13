import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { priceCreateSchema } from '@/lib/payments/product/product.validators'
import { validateRequest, validateUuidParam } from '@/lib/validators/helpers'

/**
 * POST /api/admin/products/[id]/prices
 * Cria um novo preço para o produto
 */
export const POST = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const { user } = authResult
    const { id: productId } = await params
    const invalidId = validateUuidParam(productId)
    if (invalidId) return invalidId

    const body = await request.json()
    const validation = validateRequest(priceCreateSchema, body)
    if (!validation.success) return validation.response

    const { productService } = createAdminProductServices()
    const product = await productService.createPrice(productId, validation.data, user.id)

    return NextResponse.json({ product }, { status: 201 })
  },
  { module: 'admin', action: 'create_price' }
)
