import { NextResponse } from 'next/server'

import { z } from 'zod'

import {
  createCouponSchema,
  normalizeCouponPriceIds,
  normalizeCouponProductIds,
  toCouponInsertRow,
} from '@/app/api/admin/coupons/coupon-validators'
import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import {
  assertCouponPriceScope,
  countCouponRedemptions,
  deleteAdminCoupon,
  getAdminCoupon,
  setCouponActive,
  syncCouponLinks,
  updateAdminCoupon,
} from '@/lib/payments/admin-coupon-store'

const patchCouponActiveSchema = z.object({
  active: z.boolean(),
})

/**
 * GET /api/admin/coupons/[id]
 */
export const GET = createApiHandlerWithParams<{ id: string }>(
  async (_request: Request, context) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    const { id } = await context.params
    const coupon = await getAdminCoupon(id)
    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ coupon })
  },
  { module: 'admin', action: 'get_coupon' }
)

/**
 * PUT /api/admin/coupons/[id]
 */
export const PUT = createApiHandlerWithParams<{ id: string }>(
  async (request: Request, context) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    const { id } = await context.params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const validation = createCouponSchema.safeParse(body)
    if (!validation.success) {
      const first = validation.error.issues[0]
      return NextResponse.json(
        { error: first?.message ?? 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const normalizedProductIds = normalizeCouponProductIds(validation.data)
    const normalizedPriceIds = normalizeCouponPriceIds(validation.data)
    const priceScope = await assertCouponPriceScope(normalizedPriceIds, normalizedProductIds)
    if (!priceScope.ok) {
      return NextResponse.json({ error: priceScope.message }, { status: 400 })
    }

    const row = toCouponInsertRow(validation.data, normalizedProductIds, normalizedPriceIds)

    const coupon = await updateAdminCoupon(id, row)
    if (coupon && 'conflict' in coupon) {
      return NextResponse.json({ error: 'Já existe um cupom com este código' }, { status: 409 })
    }
    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    await syncCouponLinks(id, normalizedProductIds, normalizedPriceIds)
    return NextResponse.json({ coupon: await getAdminCoupon(id) })
  },
  { module: 'admin', action: 'update_coupon' }
)

/**
 * PATCH /api/admin/coupons/[id]
 * Atualiza só o flag `active` (atalho na listagem admin).
 */
export const PATCH = createApiHandlerWithParams<{ id: string }>(
  async (request: Request, context) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    const { id } = await context.params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const validation = patchCouponActiveSchema.safeParse(body)
    if (!validation.success) {
      const first = validation.error.issues[0]
      return NextResponse.json(
        { error: first?.message ?? 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const coupon = await setCouponActive(id, validation.data.active)
    if (!coupon) {
      return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ coupon })
  },
  { module: 'admin', action: 'patch_coupon_active' }
)

/**
 * DELETE /api/admin/coupons/[id]
 * Só permite excluir se não houver resgates (preserva auditoria).
 */
export const DELETE = createApiHandlerWithParams<{ id: string }>(
  async (_request: Request, context) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    const { id } = await context.params
    const count = await countCouponRedemptions(id)

    if (count > 0) {
      return NextResponse.json(
        {
          error:
            'Não é possível excluir: já existem pedidos vinculados a este cupom. Desative o cupom em vez disso.',
        },
        { status: 409 }
      )
    }

    await deleteAdminCoupon(id)

    return NextResponse.json({ ok: true })
  },
  { module: 'admin', action: 'delete_coupon' }
)
