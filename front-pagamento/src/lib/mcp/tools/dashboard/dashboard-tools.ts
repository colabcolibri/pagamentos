import 'server-only'
import { z } from 'zod'

import { dashboardGatewaySchema, dashboardPeriodSchema } from '@/lib/admin/dashboard-filter'
import { loadDashboardStats } from '@/lib/admin/dashboard-stats'

import type { McpTool } from '../../core/types'
import { defineTool } from '../shared'

export const DASHBOARD_TOOLS: McpTool[] = [
  defineTool({
    name: 'resumo_ler',
    title: 'Resumo e relatório do painel',
    description:
      'Lê KPIs, série temporal (series), quebra por método/gateway, top produtos e pedidos recentes. Aceita filtros opcionais de período e gateway. Valores monetários em centavos BRL.',
    policyKey: 'resumo',
    action: 'read',
    risk: 'baixo',
    input: z.object({
      period: dashboardPeriodSchema
        .optional()
        .describe('Período: today, 7d, 30d (padrão), month, 90d ou all.'),
      gateway: dashboardGatewaySchema
        .optional()
        .describe('Gateway: all (padrão), asaas ou pagarme.'),
    }),
    handler: async (args) =>
      loadDashboardStats({
        period: args.period ?? '30d',
        gateway: args.gateway ?? 'all',
      }),
  }),
]
