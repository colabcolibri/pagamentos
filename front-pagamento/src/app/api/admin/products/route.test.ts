import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET, POST } from './route'

const getAllProducts = vi.fn()
const createProductWithPrices = vi.fn()

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
    productService: { getAllProducts, createProductWithPrices },
  })),
}))

const { requireAdmin } = await import('@/lib/auth')

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAllProducts.mockResolvedValue([{ id: 'p1', ref: 'x' }])
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/products'))
    expect(res.status).toBe(401)
  })

  it('lista produtos', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await GET(new Request('http://localhost/api/admin/products'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.products).toHaveLength(1)
  })
})

describe('POST /api/admin/products', () => {
  const validBody = {
    name: 'Produto teste',
    ref: 'prod-teste-api-unique',
    prices: [{ ref: 'preco-1', amount: 9990, currency: 'BRL', recurring: false }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createProductWithPrices.mockResolvedValue({ id: 'new', ...validBody })
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(
      new Request('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      })
    )
    expect(res.status).toBe(401)
  })

  it('cria produto quando body é válido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@test.local' },
    })

    const res = await POST(
      new Request('http://localhost/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.product.id).toBe('new')
    expect(createProductWithPrices).toHaveBeenCalled()
  })
})
