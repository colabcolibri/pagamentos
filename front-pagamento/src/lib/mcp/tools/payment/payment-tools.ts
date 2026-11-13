import 'server-only'
import { z } from 'zod'

import { recordAdminAction } from '@/lib/admin/audit'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { getLogger } from '@/lib/logger'
import { cancelAdminPaymentLink } from '@/lib/payments/admin-cancel-payment-link'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

export const PAYMENT_TOOLS: McpTool[] = [
  defineTool({
    name: 'pagamento_listar',
    title: 'Listar pagamentos',
    description: 'Lista id, estado, valor e gateway. Sem cartão e sem chave.',
    policyKey: 'pagamento',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, order_id, status, amount_cents, 'pagarme' AS gateway, created_at
         FROM payments.pagarme_payments
         UNION ALL
         SELECT id, order_id, status, amount_cents, 'asaas' AS gateway, created_at
         FROM payments.asaas_payments
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
  defineTool({
    name: 'pagamento_abrir',
    title: 'Abrir pagamento',
    description: 'Abre id, estado, valor e gateway. Sem cartão e sem código PIX.',
    policyKey: 'pagamento',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid(), gateway: z.enum(['pagarme', 'asaas']) }),
    handler: async (args) => {
      const table = args.gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'
      const rows = await getPool().query(
        `SELECT id, order_id, status, amount_cents, created_at FROM payments.${table} WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  defineTool({
    name: 'pagamento_cancelar',
    title: 'Cancelar pagamento',
    description: 'Cancela no gateway com a mesma regra da tela. Estado proibido é recusado.',
    policyKey: 'pagamento',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      id: z.string().uuid(),
      gateway: z.enum(['pagarme', 'asaas']),
    }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const result = await cancelAdminPaymentLink({
        supabase: createAdminPaymentsClient(),
        paymentRowId: args.id,
        gateway: args.gateway,
        logger: getLogger(),
      })
      if (!result.ok) throw new Error(result.error)
      await recordAdminAction(getPool(), {
        actorId: ctx.principal.id,
        action: 'payment.cancel',
        targetType: 'payment',
        targetId: args.id,
      })
      return { cancelled: args.id }
    },
  }),
]
