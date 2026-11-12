import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const query = vi.fn()

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query }),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

const { requireAdmin } = await import('@/lib/auth')

const logId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('GET /api/admin/email-logs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request(`http://localhost/api/admin/email-logs/${logId}`), {
      params: Promise.resolve({ id: logId }),
    })
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando registro não existe', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@exemplo.com' },
    })
    query.mockResolvedValue({ rows: [] })

    const res = await GET(new Request(`http://localhost/api/admin/email-logs/${logId}`), {
      params: Promise.resolve({ id: logId }),
    })
    expect(res.status).toBe(404)
  })
})
