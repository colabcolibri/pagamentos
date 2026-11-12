import { describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({
    query: vi.fn(async () => ({
      rows: [
        {
          action: 'mcp.tool.call',
          detail: 'quem_sou:read:permitido:ok',
        },
      ],
    })),
  }),
}))

describe('auditoria no MCP', () => {
  it('devolve ferramenta e resultado sem segredo e sem ferramenta de exclusão', async () => {
    const tool = MCP_TOOLS.find((item) => item.name === 'auditoria_listar')!
    const result = await executeTool(
      tool,
      {},
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@quitou.local',
        clientId: 'c1',
      },
      {
        loadPolicy: async () => ({ enabled: true, grants: { auditoria: ['read'] } }),
        audit: vi.fn(),
      }
    )
    expect(result.content[0]?.text).toContain('quem_sou:read:permitido')
    expect(result.content[0]?.text).not.toContain('SECRET_')
    expect(MCP_TOOLS.some((item) => item.policyKey === 'auditoria' && item.action !== 'read')).toBe(
      false
    )
  })
})
