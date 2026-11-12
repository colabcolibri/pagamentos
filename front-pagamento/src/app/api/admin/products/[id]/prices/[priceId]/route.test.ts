import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE } from './route'

const deletePrice = vi.fn()

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

vi.mock('@/lib/payments/factories/service-factory', () => ({
  createAdminProductServices: vi.fn(() => ({
    productService: { deletePrice },
  })),
}))

const { requireAdmin } = await import('@/lib/auth')

const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const priceId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

describe('DELETE /api/admin/products/[id]/prices/[priceId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deletePrice.mockResolvedValue(undefined)
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await DELETE(
      new Request(`http://localhost/api/admin/products/${productId}/prices/${priceId}`),
      { params: Promise.resolve({ id: productId, priceId }) }
    )
    expect(res.status).toBe(401)
  })

  it('remove preço quando admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin', email: 'admin@test.local' },
    })

    const res = await DELETE(
      new Request(`http://localhost/api/admin/products/${productId}/prices/${priceId}`),
      { params: Promise.resolve({ id: productId, priceId }) }
    )
    expect(res.status).toBe(200)
    expect(deletePrice).toHaveBeenCalledWith(productId, priceId, 'admin')
  })
})
