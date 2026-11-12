import { describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}

describe('modelos de reembolso', () => {
  it('recusa apagar porque a rota não apaga', async () => {
    const tool = MCP_TOOLS.find((item) => item.name === 'reembolso_apagar')!
    const result = await executeTool(tool, { id: 'course-policy', confirmar: true }, principal, {
      loadPolicy: async () => ({ enabled: true, grants: { reembolso: ['delete'] } }),
      audit: vi.fn(),
    })
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('não apaga')
  })
})
