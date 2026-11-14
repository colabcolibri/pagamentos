import { NextResponse } from 'next/server'

import {
  type DashboardGateway,
  type DashboardPeriod,
  dashboardGatewaySchema,
  dashboardPeriodSchema,
} from '@/lib/admin/dashboard-filter'
import { loadDashboardStats } from '@/lib/admin/dashboard-stats'
import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'

/**
 * GET /api/admin/dashboard/stats?period=30d&gateway=all
 * Retorna estatísticas e séries do dashboard admin filtradas por período e gateway.
 */
export const GET = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const period: DashboardPeriod = dashboardPeriodSchema
      .catch('30d')
      .parse(searchParams.get('period'))
    const gateway: DashboardGateway = dashboardGatewaySchema
      .catch('all')
      .parse(searchParams.get('gateway'))

    return NextResponse.json({ stats: await loadDashboardStats({ period, gateway }) })
  },
  { module: 'admin', action: 'get_dashboard_stats' }
)
