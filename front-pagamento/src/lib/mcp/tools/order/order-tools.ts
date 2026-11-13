import 'server-only'
import { z } from 'zod'

import { recordAdminAction } from '@/lib/admin/audit'
import { getPool } from '@/lib/db/pool'
import {
  listAdminOrders,
  readAdminOrder,
  softDeleteCancelledOrder,
} from '@/lib/payments/admin-orders'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

export const ORDER_TOOLS: McpTool[] = [
  defineTool({
    name: 'pedido_listar',
    title: 'Listar pedidos',
    description: 'Lista pedidos sem dado de cartão.',
    policyKey: 'pedido',
    action: 'read',
    risk: 'baixo',
    input: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    handler: async (args) => listAdminOrders({ limit: args.limit ?? 20, offset: 0 }),
  }),
  defineTool({
    name: 'pedido_abrir',
    title: 'Abrir pedido',
    description: 'Abre um pedido.',
    policyKey: 'pedido',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args) => readAdminOrder(args.id),
  }),
  defineTool({
    name: 'pedido_cancelar',
    title: 'Cancelar pedido',
    description: 'Cancela pedido pendente, falho ou expirado.',
    policyKey: 'pedido',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid(), motivo: z.string().min(3).max(300) }),
    handler: async (args, ctx) => {
      const order = await readAdminOrder(args.id)
      if (!order) throw new Error('Pedido não encontrado')
      if (!['pending', 'failed', 'expired'].includes(String(order.status))) {
        throw new Error('Estado do pedido não permite cancelar')
      }
      const preview = guardWrite(ctx, { id: args.id, status: order.status })
      if (preview) return preview
      await getPool().query(
        `UPDATE payments.orders SET status = 'cancelled', updated_at = now()
         WHERE id = $1 AND status = ANY($2::text[])`,
        [args.id, ['pending', 'failed', 'expired']]
      )
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'order.cancel',
        targetType: 'order',
        targetId: args.id,
      })
      return { id: args.id, status: 'cancelled' }
    },
  }),
  defineTool({
    name: 'pedido_marcar_pago',
    title: 'Marcar pedido como pago',
    description: 'Recusa pedido cancelado ou reembolsado. Não marca sem confirmação.',
    policyKey: 'pedido',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid(), motivo: z.string().min(3).max(300) }),
    handler: async (args, ctx) => {
      const order = await readAdminOrder(args.id)
      if (!order) throw new Error('Pedido não encontrado')
      if (order.status === 'cancelled' || order.status === 'refunded') {
        throw new Error('Não é possível marcar como pago neste estado')
      }
      const preview = guardWrite(ctx, { id: args.id })
      if (preview) return preview
      await getPool().query(
        `UPDATE payments.orders SET status = 'paid', paid_at = now(), updated_at = now()
         WHERE id = $1 AND status <> ALL($2::text[])`,
        [args.id, ['cancelled', 'refunded']]
      )
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'order.mark_paid',
        targetType: 'order',
        targetId: args.id,
      })
      return { id: args.id, status: 'paid' }
    },
  }),
  defineTool({
    name: 'pedido_apagar',
    title: 'Apagar pedido cancelado',
    description: 'Apaga só pedido já cancelado. Delete nasce desligado.',
    policyKey: 'pedido',
    action: 'delete',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const deleted = await softDeleteCancelledOrder(args.id, ctx.principal.id)
      if (!deleted) throw new Error('Só é possível apagar pedido cancelado')
      return { deleted: args.id }
    },
  }),
]
