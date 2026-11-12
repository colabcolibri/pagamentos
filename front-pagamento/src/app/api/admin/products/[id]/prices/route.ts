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

const createPriceBodySchema = z.object({
  ref: z.string().min(1, 'Ref é obrigatório').max(100),
  amount: z.number().int().min(0),
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
})

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
    const validation = validateRequest(createPriceBodySchema, body)
    if (!validation.success) return validation.response

    const { productService } = createAdminProductServices()
    const product = await productService.createPrice(productId, validation.data, user.id)

    return NextResponse.json({ product }, { status: 201 })
  },
  { module: 'admin', action: 'create_price' }
)
