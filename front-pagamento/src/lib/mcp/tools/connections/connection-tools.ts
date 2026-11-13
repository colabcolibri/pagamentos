import 'server-only'
import { z } from 'zod'

import { runAllConnectionTests } from '@/lib/admin/connection-tests'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const CONNECTION_TOOLS: McpTool[] = [
  defineTool({
    name: 'conexao_testar',
    title: 'Testar conexões',
    description: 'Testa Postgres, gateways e Gemini. A resposta não traz chave.',
    policyKey: 'conexao',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => runAllConnectionTests(),
  }),
]
