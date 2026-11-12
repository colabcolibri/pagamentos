import { NextResponse } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

import { DELETE, GET, PATCH, PUT } from './route'

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

const couponId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('/api/admin/coupons/[id]', () => {
  it('GET retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request(`http://localhost/api/admin/coupons/${couponId}`), {
      params: Promise.resolve({ id: couponId }),
    })
    expect(res.status).toBe(401)
  })

  it('PUT retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await PUT(
      new Request(`http://localhost/api/admin/coupons/${couponId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: couponId }) }
    )
    expect(res.status).toBe(401)
  })

  it('PATCH retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await PATCH(
      new Request(`http://localhost/api/admin/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      }),
      { params: Promise.resolve({ id: couponId }) }
    )
    expect(res.status).toBe(401)
  })

  it('DELETE retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await DELETE(new Request(`http://localhost/api/admin/coupons/${couponId}`), {
      params: Promise.resolve({ id: couponId }),
    })
    expect(res.status).toBe(401)
  })
})
