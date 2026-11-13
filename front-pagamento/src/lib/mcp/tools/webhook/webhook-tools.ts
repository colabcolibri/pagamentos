import 'server-only'
import { z } from 'zod'

import { getPool } from '@/lib/db/pool'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const WEBHOOK_TOOLS: McpTool[] = [
  defineTool({
    name: 'webhook_abrir',
    title: 'Abrir webhook recebido',
    description: 'Abre o estado do webhook, sem o corpo.',
    policyKey: 'webhook',
    action: 'read',
    risk: 'baixo',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args) => {
      const rows = await getPool().query(
        `SELECT id, provider, event_type, processing_status, created_at
         FROM payments.webhook_events WHERE id = $1`,
        [args.id]
      )
      return rows.rows[0] ?? null
    },
  }),
  defineTool({
    name: 'webhook_listar',
    title: 'Listar webhooks recebidos',
    description: 'Lista o estado do webhook, sem o corpo.',
    policyKey: 'webhook',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, provider, event_type, processing_status, created_at
         FROM payments.webhook_events
         ORDER BY created_at DESC
         LIMIT 30`
      )
      return rows.rows
    },
  }),
]
