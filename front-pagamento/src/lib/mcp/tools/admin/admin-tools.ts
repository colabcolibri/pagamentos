import 'server-only'
import { z } from 'zod'

import { getPool } from '@/lib/db/pool'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

export const ADMIN_TOOLS: McpTool[] = [
  defineTool({
    name: 'admin_listar',
    title: 'Listar admins',
    description: 'Lista e-mail e se está ativo. Sem token.',
    policyKey: 'admin',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => {
      const rows = await getPool().query(
        `SELECT id, name, email, role, is_active FROM payments.admin_users ORDER BY created_at DESC`
      )
      return rows.rows
    },
  }),
  defineTool({
    name: 'admin_desativar',
    title: 'Desativar admin',
    description: 'Desativa outro admin. Não apaga a linha.',
    policyKey: 'admin',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ id: z.string().uuid() }),
    handler: async (args, ctx) => {
      if (args.id === ctx.principal.id) {
        throw new Error('Não desative o seu próprio acesso por aqui')
      }
      const preview = guardWrite(ctx, args)
      if (preview) return preview
      const rows = await getPool().query(
        `UPDATE payments.admin_users SET is_active = false WHERE id = $1 RETURNING id, email, is_active`,
        [args.id]
      )
      if (!rows.rows[0]) throw new Error('Admin não encontrado')
      return rows.rows[0]
    },
  }),
]
