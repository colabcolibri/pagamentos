import 'server-only'
import { z } from 'zod'

import { getPool } from '@/lib/db/pool'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const AUDIT_TOOLS: McpTool[] = [
  defineTool({
    name: 'auditoria_listar',
    title: 'Listar auditoria',
    description: 'Lista eventos, inclusive chamadas do MCP, sem chave.',
    policyKey: 'auditoria',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, actor_id, action, target_type, target_id, detail, created_at
         FROM payments.admin_audit_events
         ORDER BY created_at DESC
         LIMIT 50`
      )
      return rows.rows
    },
  }),
]
