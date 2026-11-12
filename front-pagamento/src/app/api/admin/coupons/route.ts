import { NextResponse } from 'next/server'

import { z } from 'zod'

import {
  createCouponSchema,
  normalizeCouponPriceIds,
  normalizeCouponProductIds,
  toCouponInsertRow,
} from '@/app/api/admin/coupons/coupon-validators'
import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import {
  assertCouponPriceScope,
  deleteAdminCoupon,
  getAdminCoupon,
  insertAdminCoupon,
  listAdminCoupons,
  syncCouponLinks,
} from '@/lib/payments/admin-coupon-store'

const listQuerySchema = z.object({
  active: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return undefined
      if (v === 'all') return 'all' as const
      return v === 'true'
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return 100
      const n = parseInt(v, 10)
      if (!Number.isFinite(n) || n < 1) return 100
      return Math.min(n, 1000)
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return 0
      const n = parseInt(v, 10)
      return !Number.isFinite(n) || n < 0 ? 0 : n
    }),
})

/**
 * GET /api/admin/coupons
 */
export const GET = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      active: searchParams.get('active') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { active, limit, offset } = parsed.data
    const listed = await listAdminCoupons({ active, limit, offset })

    return NextResponse.json({
      coupons: listed.coupons,
      total: listed.total,
      limit,
      offset,
    })
  },
  { module: 'admin', action: 'list_coupons' }
)

/**
 * POST /api/admin/coupons
 */
export const POST = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
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

    const coupon = await insertAdminCoupon(row)
    if ('conflict' in coupon) {
      return NextResponse.json({ error: 'Já existe um cupom com este código' }, { status: 409 })
    }

    try {
      await syncCouponLinks(coupon.id, normalizedProductIds, normalizedPriceIds)
    } catch (syncErr) {
      await deleteAdminCoupon(coupon.id)
      throw syncErr
    }

    return NextResponse.json({ coupon: await getAdminCoupon(coupon.id) })
  },
  { module: 'admin', action: 'create_coupon' }
)
