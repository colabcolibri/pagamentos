import { describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const query = vi.fn(async (sql: string) => {
  expect(sql.toLowerCase()).not.toContain('payload')
  return { rows: [{ id: '1', provider: 'asaas', processing_status: 'received' }] }
})

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query }),
}))

describe('webhooks no MCP', () => {
  it('lista sem o corpo e não oferece escrita', async () => {
    const tool = MCP_TOOLS.find((item) => item.name === 'webhook_listar')!
    const result = await executeTool(
      tool,
      {},
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@quitou.local',
        clientId: 'c1',
      },
      {
        loadPolicy: async () => ({
          enabled: true,
          grants: { webhook: ['read', 'upsert', 'delete'] },
        }),
        audit: vi.fn(),
      }
    )
    expect(result.content[0]?.text).not.toContain('SECRET_')
    expect(MCP_TOOLS.some((item) => item.policyKey === 'webhook' && item.action !== 'read')).toBe(
      false
    )
  })
})
