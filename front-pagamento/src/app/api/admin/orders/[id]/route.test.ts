import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE, GET } from './route'

const readAdminOrder = vi.fn()
const softDeleteCancelledOrder = vi.fn()

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

vi.mock('@/lib/payments/admin-orders', () => ({
  readAdminOrder: (...args: unknown[]) => readAdminOrder(...args),
  softDeleteCancelledOrder: (...args: unknown[]) => softDeleteCancelledOrder(...args),
}))

const { requireAdmin } = await import('@/lib/auth')

const orderUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('GET /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readAdminOrder.mockResolvedValue({ id: orderUuid, status: 'paid' })
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request(`http://localhost/api/admin/orders/${orderUuid}`), {
      params: Promise.resolve({ id: orderUuid }),
    })
    expect(res.status).toBe(401)
  })

  it('retorna 400 quando id não é UUID', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(new Request('http://localhost/api/admin/orders/invalid'), {
      params: Promise.resolve({ id: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  it('retorna pedido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(
      new Request(`http://localhost/api/admin/orders/${orderUuid}?id=${orderUuid}`),
      { params: Promise.resolve({ id: orderUuid }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order.id).toBe(orderUuid)
  })
})

describe('DELETE /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 403 quando pedido não está cancelado', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin', email: 'admin@test.local' },
    })
    readAdminOrder.mockResolvedValue({ id: orderUuid, status: 'paid' })

    const res = await DELETE(new Request(`http://localhost/api/admin/orders/${orderUuid}`), {
      params: Promise.resolve({ id: orderUuid }),
    })
    expect(res.status).toBe(403)
  })

  it('deleta pedido cancelado', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin', email: 'admin@test.local' },
    })
    readAdminOrder.mockResolvedValue({ id: orderUuid, status: 'cancelled' })
    softDeleteCancelledOrder.mockResolvedValue({ id: orderUuid })

    const res = await DELETE(new Request(`http://localhost/api/admin/orders/${orderUuid}`), {
      params: Promise.resolve({ id: orderUuid }),
    })
    expect(res.status).toBe(200)
    expect(softDeleteCancelledOrder).toHaveBeenCalledWith(orderUuid, 'admin')
  })

  it('retorna 404 quando pedido não existe', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin', email: 'admin@test.local' },
    })
    readAdminOrder.mockResolvedValue(null)

    const res = await DELETE(new Request(`http://localhost/api/admin/orders/${orderUuid}`), {
      params: Promise.resolve({ id: orderUuid }),
    })
    expect(res.status).toBe(404)
  })
})
