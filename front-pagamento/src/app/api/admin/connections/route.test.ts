import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

const runAllConnectionTests = vi.fn()

vi.mock('@/lib/admin/connection-tests', () => ({
  runAllConnectionTests: () => runAllConnectionTests(),
}))

const { requireAdmin } = await import('@/lib/auth')

describe('GET /api/admin/connections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna connections quando admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })
    runAllConnectionTests.mockResolvedValue([{ name: 'smtp', ok: true }])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connections).toEqual([{ name: 'smtp', ok: true }])
  })
})
