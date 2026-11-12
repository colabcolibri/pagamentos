import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { createAdminProductServices } from '@/lib/payments/factories/service-factory'
import { uuidSchema } from '@/lib/validators/common'
import { validateRequest, validateUuidParam } from '@/lib/validators/helpers'

const pricePromoTierSchema = z.object({
  id: uuidSchema.optional(),
  sort_order: z.number().int().min(0),
  discount_percent: z.number().int().min(0).max(100),
  ends_at: z
    .union([z.string(), z.null()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  max_units: z.union([z.number().int().positive(), z.null()]).optional().nullable(),
  applies_to: z.enum(['avista', 'parcelado', 'both']).optional().default('both'),
})

const updatePriceBodySchema = z.object({
  ref: z.string().min(1).max(100).optional(),
  amount: z.number().int().min(0).optional(),
  currency: z.string().max(10).optional(),
  recurring: z.boolean().optional(),
  interval: z
    .enum(['day', 'week', 'month', 'year'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  interval_count: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.any().optional().nullable(),
  email_addon: z.any().optional().nullable(),
  stock_cap: z.union([z.number().int().positive(), z.null()]).optional().nullable(),
  promo_tiers: z.array(pricePromoTierSchema).optional(),
  upgrade_to_price_ids: z.array(uuidSchema).optional(),
  addon_price_ids: z.array(uuidSchema).optional(),
})

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
