import 'server-only'
import { z } from 'zod'

import {
  createCouponSchema,
  normalizeCouponPriceIds,
  normalizeCouponProductIds,
  toCouponInsertRow,
} from '@/app/api/admin/coupons/coupon-validators'
import {
  assertCouponPriceScope,
  deleteAdminCoupon,
  getAdminCoupon,
  insertAdminCoupon,
  listAdminCoupons,
  syncCouponLinks,
  updateAdminCoupon,
} from '@/lib/payments/admin-coupon-store'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

const couponSaveSchema = createCouponSchema.safeExtend({
  id: z.string().uuid().optional(),
})

export const COUPON_TOOLS: McpTool[] = [
  defineTool({
    name: 'cupom_listar',
    title: 'Listar cupons',
    description: 'Lista cupons.',
    policyKey: 'cupom',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => listAdminCoupons({ active: 'all', limit: 50, offset: 0 }),
  }),
  defineTool({
    name: 'cupom_abrir',
    title: 'Abrir cupom',
    description: 'Abre um cupom.',
    policyKey: 'cupom',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args) => getAdminCoupon(args.id),
  }),
  defineTool({
    name: 'cupom_salvar',
    title: 'Salvar cupom',
    description:
      'Cadastra ou edita cupom completo (percentual ou valor fixo, aplica em à vista/parcelado/ambos, produtos/preços vinculados, limites, vigência, ativo e textos públicos).',
    policyKey: 'cupom',
    action: 'upsert',
    risk: 'alto',
    input: couponSaveSchema,
    handler: async (args, ctx) => {
      const normalizedProductIds = normalizeCouponProductIds(args)
      const normalizedPriceIds = normalizeCouponPriceIds(args)
      const priceScope = await assertCouponPriceScope(normalizedPriceIds, normalizedProductIds)
      if (!priceScope.ok) throw new Error(priceScope.message)

      const row = toCouponInsertRow(args, normalizedProductIds, normalizedPriceIds)
      const preview = guardWrite(ctx, {
        id: args.id,
        ...row,
        product_ids: normalizedProductIds,
        price_ids: normalizedPriceIds,
      })
      if (preview) return preview

      if (args.id) {
        const updated = await updateAdminCoupon(args.id, row)
        if (updated && 'conflict' in updated) {
          throw new Error('Já existe um cupom com este código')
        }
        if (!updated) throw new Error('Cupom não encontrado')
        await syncCouponLinks(args.id, normalizedProductIds, normalizedPriceIds)
        return getAdminCoupon(args.id)
      }

      const inserted = await insertAdminCoupon(row)
      if ('conflict' in inserted) {
        throw new Error('Já existe um cupom com este código')
      }
      try {
        await syncCouponLinks(inserted.id, normalizedProductIds, normalizedPriceIds)
      } catch (err) {
        await deleteAdminCoupon(inserted.id)
        throw err
      }
      return getAdminCoupon(inserted.id)
    },
  }),
  defineTool({
    name: 'cupom_apagar',
    title: 'Apagar cupom',
    description: 'Apaga o cupom. Delete nasce desligado.',
    policyKey: 'cupom',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      await deleteAdminCoupon(args.id)
      return { deleted: args.id }
    },
  }),
]
