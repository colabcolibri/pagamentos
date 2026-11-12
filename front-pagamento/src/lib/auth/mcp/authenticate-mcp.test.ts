import { beforeEach, describe, expect, it, vi } from 'vitest'

import { principalFromAccessToken } from '@/lib/mcp/auth/oauth-store'

import { authenticateMcpBearer, readBearer } from './authenticate-mcp'

vi.mock('@/lib/mcp/auth/oauth-store', () => ({
  principalFromAccessToken: vi.fn(),
}))

describe('authenticateMcpBearer', () => {
  beforeEach(() => {
    vi.mocked(principalFromAccessToken).mockReset()
  })

  it('recusa anônimo e não consulta token', async () => {
    expect(readBearer(null)).toBeNull()
    expect(await authenticateMcpBearer(null)).toBeNull()
    expect(principalFromAccessToken).not.toHaveBeenCalled()
  })

  it('aceita admin e recusa comprador ou token revogado', async () => {
    vi.mocked(principalFromAccessToken).mockResolvedValueOnce({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@quitou.local',
      clientId: 'c1',
    })
    const admin = await authenticateMcpBearer('Bearer token-admin')
    expect(admin?.email).toBe('admin@quitou.local')
    expect(JSON.stringify(admin)).not.toContain('token-admin')

    vi.mocked(principalFromAccessToken).mockResolvedValueOnce(null)
    expect(await authenticateMcpBearer('Bearer token-comprador')).toBeNull()
  })
})
