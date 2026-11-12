import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE, GET, PUT } from './route'

const getProductById = vi.fn()
const updateProduct = vi.fn()
const deleteProduct = vi.fn()

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
    productService: { getProductById, updateProduct, deleteProduct },
  })),
}))

const { requireAdmin } = await import('@/lib/auth')

const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('/api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProductById.mockResolvedValue({
      id: productId,
      name: 'P',
      ref: 'r',
      active: true,
      prices: [],
    })
  })

  it('GET retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request(`http://localhost/api/admin/products/${productId}`), {
      params: Promise.resolve({ id: productId }),
    })
    expect(res.status).toBe(401)
  })

  it('GET retorna produto', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(new Request(`http://localhost/api/admin/products/${productId}`), {
      params: Promise.resolve({ id: productId }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.product.id).toBe(productId)
  })

  it('DELETE retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await DELETE(new Request(`http://localhost/api/admin/products/${productId}`), {
      params: Promise.resolve({ id: productId }),
    })
    expect(res.status).toBe(401)
  })

  it('PUT retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await PUT(
      new Request(`http://localhost/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Novo nome', ref: 'novo-ref-xyz' }),
      }),
      { params: Promise.resolve({ id: productId }) }
    )
    expect(res.status).toBe(401)
  })
})
