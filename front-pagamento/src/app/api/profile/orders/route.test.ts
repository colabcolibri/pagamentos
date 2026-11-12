import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

vi.mock('@/lib/auth/api-context', () => ({
  getApiContext: vi.fn(),
}))

vi.mock('@/lib/profile/profile-store', () => ({
  listOwnOrders: vi.fn(),
}))

const { getApiContext } = await import('@/lib/auth/api-context')
const { listOwnOrders } = await import('@/lib/profile/profile-store')

describe('GET /api/profile/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listOwnOrders).mockResolvedValue([{ id: 'o1' }] as never)
  })

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(getApiContext).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const res = await GET(new Request('http://localhost/api/profile/orders'))
    expect(res.status).toBe(401)
  })

  it('lista pedidos do usuário autenticado', async () => {
    vi.mocked(getApiContext).mockResolvedValue({
      user: { id: 'user-uuid', email: 'a@b.com' },
    })

    const res = await GET(new Request('http://localhost/api/profile/orders'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orders).toEqual([{ id: 'o1' }])
    expect(listOwnOrders).toHaveBeenCalledWith('user-uuid')
  })
})
