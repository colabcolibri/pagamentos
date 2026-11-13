import 'server-only'
import { z } from 'zod'

import { getPool } from '@/lib/db/pool'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const SUBSCRIPTION_TOOLS: McpTool[] = [
  defineTool({
    name: 'assinatura_listar',
    title: 'Listar assinaturas',
    description: 'Lista assinaturas. Não grava.',
    policyKey: 'assinatura',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, status, price_id, user_id, created_at
         FROM payments.subscriptions
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
]
