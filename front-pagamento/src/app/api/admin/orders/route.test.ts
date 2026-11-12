import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const listAdminOrders = vi.fn()
const countAdminOrders = vi.fn()

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/payments/admin-orders', () => ({
  listAdminOrders: (...args: unknown[]) => listAdminOrders(...args),
  countAdminOrders: (...args: unknown[]) => countAdminOrders(...args),
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

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAdminOrders.mockResolvedValue([{ id: 'o1' }])
    countAdminOrders.mockResolvedValue(1)
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/orders'))
    expect(res.status).toBe(401)
  })

  it('retorna pedidos e total', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(new Request('http://localhost/api/admin/orders'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orders).toEqual([{ id: 'o1' }])
    expect(body.total).toBe(1)
  })
})
