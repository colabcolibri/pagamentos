import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDashboardStats } from '@/lib/admin/dashboard-stats'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

vi.mock('@/lib/admin/dashboard-stats', () => ({
  loadDashboardStats: vi.fn(async () => ({
    products: { total: 2, active: 1 },
    payments: { total: 3, thisMonth: 1, revenue: 100 },
  })),
}))

describe('resumo do painel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devolve o objeto do serviço e não grava', async () => {
    const tool = MCP_TOOLS.find((item) => item.name === 'resumo_ler')!
    const result = await executeTool(
      tool,
      {},
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@quitou.local',
        clientId: 'c1',
      },
      {
        loadPolicy: async () => ({ enabled: true, grants: { resumo: ['read'] } }),
        audit: vi.fn(),
      }
    )
    expect(loadDashboardStats).toHaveBeenCalledWith({ period: '30d', gateway: 'all' })
    expect(result.content[0]?.text).toContain('"total":2')
    expect(MCP_TOOLS.some((item) => item.policyKey === 'resumo' && item.action !== 'read')).toBe(
      false
    )
  })

  it('repassa filtros opcionais de período e gateway', async () => {
    const tool = MCP_TOOLS.find((item) => item.name === 'resumo_ler')!
    await executeTool(
      tool,
      { period: '7d', gateway: 'asaas' },
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@quitou.local',
        clientId: 'c1',
      },
      {
        loadPolicy: async () => ({ enabled: true, grants: { resumo: ['read'] } }),
        audit: vi.fn(),
      }
    )
    expect(loadDashboardStats).toHaveBeenCalledWith({ period: '7d', gateway: 'asaas' })
  })
})
