import 'server-only'
import { z } from 'zod'

import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import {
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from '@/lib/email-helpers'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

export const EMAIL_TOOLS: McpTool[] = [
  defineTool({
    name: 'email_listar',
    title: 'Listar e-mails',
    description: 'Lista o histórico sem senha SMTP.',
    policyKey: 'email',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, recipient, subject, status, created_at
         FROM payments.email_logs
         ORDER BY created_at DESC
         LIMIT 30`
      )
      return rows.rows
    },
  }),
  defineTool({
    name: 'email_abrir',
    title: 'Abrir e-mail',
    description: 'Abre destinatário, assunto e estado. Sem o HTML e sem senha SMTP.',
    policyKey: 'email',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args) => {
      const rows = await getPool().query(
        `SELECT id, recipient, subject, status, order_id, created_at
         FROM payments.email_logs WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  defineTool({
    name: 'email_reenviar',
    title: 'Reenviar e-mail do pedido',
    description: 'Reenvia o aviso de pedido ou de pagamento confirmado.',
    policyKey: 'email',
    action: 'upsert',
    risk: 'alto',
    input: z.object({
      orderId: z.string().uuid(),
      emailType: z.enum(['order_created', 'payment_confirmed']),
    }),
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const database = createAdminPaymentsClient()
      if (args.emailType === 'order_created') {
        await sendOrderCreatedEmailFromOrder(database, args.orderId, undefined, undefined, true)
      } else {
        await sendPaymentConfirmedEmailFromOrder(database, args.orderId, undefined, true)
      }
      return { resent: args.orderId, emailType: args.emailType }
    },
  }),
]
