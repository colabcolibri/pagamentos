import 'server-only'
import { z } from 'zod'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const IDENTITY_TOOLS: McpTool[] = [
  defineTool({
    name: 'quem_sou',
    title: 'Quem está conectado',
    description: 'Devolve o e-mail do admin autenticado, sem o token.',
    policyKey: 'identidade',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async (_args, ctx) => ({ id: ctx.principal.id, email: ctx.principal.email }),
  }),
]
