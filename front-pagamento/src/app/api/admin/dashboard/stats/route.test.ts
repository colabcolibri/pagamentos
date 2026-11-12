import { NextResponse } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

import { GET } from './route'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
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

describe('GET /api/admin/dashboard/stats', () => {
  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/dashboard/stats'))
    expect(res.status).toBe(401)
  })
})
