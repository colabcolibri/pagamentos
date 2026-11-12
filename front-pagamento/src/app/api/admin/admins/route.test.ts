import { NextResponse } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

import { GET } from './route'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: vi.fn(),
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
const { getPool } = await import('@/lib/db/pool')

describe('GET /api/admin/admins', () => {
  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/admins'))
    expect(res.status).toBe(401)
  })

  it('lista administradores para quem já é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: '1', email: 'ana@quitou.local' },
    })
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: '1',
            name: 'Ana',
            email: 'ana@quitou.local',
            role: 'admin',
            is_active: true,
            created_at: '2026-11-10T00:00:00.000Z',
          },
        ],
      }),
    } as never)

    const res = await GET(new Request('http://localhost/api/admin/admins'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      admins: [
        {
          id: '1',
          name: 'Ana',
          email: 'ana@quitou.local',
          role: 'admin',
          is_active: true,
          created_at: '2026-11-10T00:00:00.000Z',
        },
      ],
    })
  })
})
