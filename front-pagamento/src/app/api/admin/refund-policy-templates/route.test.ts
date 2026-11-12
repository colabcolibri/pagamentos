import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('GET /api/admin/refund-policy-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/refund-policy-templates'))
    expect(res.status).toBe(401)
  })

  it('retorna lista de templates quando autenticado', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(new Request('http://localhost/api/admin/refund-policy-templates'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.templates)).toBe(true)
    expect(body.templates.length).toBeGreaterThanOrEqual(3)
  })
})
