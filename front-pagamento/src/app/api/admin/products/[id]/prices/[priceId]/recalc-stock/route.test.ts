import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const productId = '11111111-1111-4111-8111-111111111111'
const priceId = '22222222-2222-4222-8222-222222222222'

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

function buildRequest() {
  return new Request(
    `http://localhost/api/admin/products/${productId}/prices/${priceId}/recalc-stock`,
    { method: 'POST' }
  )
}

describe('POST /api/admin/products/[id]/prices/[priceId]/recalc-stock', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(getPool).mockReset()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: productId, priceId }),
    })

    expect(res.status).toBe(401)
    expect(getPool).not.toHaveBeenCalled()
  })

  it('retorna 400 quando priceId não é uuid válido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'a@b.c' },
    })

    const res = await POST(
      new Request(
        `http://localhost/api/admin/products/${productId}/prices/not-a-uuid/recalc-stock`,
        { method: 'POST' }
      ),
      {
        params: Promise.resolve({ id: productId, priceId: 'not-a-uuid' }),
      }
    )

    expect(res.status).toBe(400)
    expect(getPool).not.toHaveBeenCalled()
  })

  it('chama recalc_stock_for_price e devolve stock_sold', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ stock_sold: 7 }] })
    vi.mocked(getPool).mockReturnValue({ query } as never)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'a@b.c' },
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: productId, priceId }),
    })

    expect(res.status).toBe(200)
    expect(query).toHaveBeenNthCalledWith(1, 'SELECT payments.recalc_stock_for_price($1)', [
      priceId,
    ])
    const body = await res.json()
    expect(body).toEqual({ stock_sold: 7 })
  })

  it('retorna 500 quando a função falha', async () => {
    vi.mocked(getPool).mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error('rpc falhou')),
    } as never)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'a@b.c' },
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: productId, priceId }),
    })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('rpc falhou')
  })
})
