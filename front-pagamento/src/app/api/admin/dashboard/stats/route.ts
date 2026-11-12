import { NextResponse } from 'next/server'

import { loadDashboardStats } from '@/lib/admin/dashboard-stats'
import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'

/**
 * GET /api/admin/dashboard/stats
 * Retorna estatísticas do dashboard admin
 * - Total de produtos (total e ativos)
 * - Total de pagamentos (total, do mês, revenue)
 * - Total de pedidos (total, pendentes, pagos)
 * - Total de assinaturas (total e ativas)
 * - Total de webhooks (total e hoje)
 * - Requer autenticação e permissão de admin
 */
export const GET = createApiHandler(
  async (_request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    return NextResponse.json({ stats: await loadDashboardStats() })
  },
  { module: 'admin', action: 'get_dashboard_stats' }
)
