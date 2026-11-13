import 'server-only'
import { z } from 'zod'

import { loadDashboardStats } from '@/lib/admin/dashboard-stats'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const DASHBOARD_TOOLS: McpTool[] = [
  defineTool({
    name: 'resumo_ler',
    title: 'Resumo do painel',
    description: 'Conta produtos, pedidos e pagamentos com a mesma base da tela.',
    policyKey: 'resumo',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => loadDashboardStats(),
  }),
]
