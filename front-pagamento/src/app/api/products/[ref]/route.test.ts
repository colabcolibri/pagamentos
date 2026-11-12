import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const findPublicProductByRef = vi.fn()

vi.mock('@/lib/payments/catalog/postgres-catalog', () => ({
  findPublicProductByRef: (...args: unknown[]) => findPublicProductByRef(...args),
}))

describe('GET /api/products/[ref]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 400 quando ref está vazio', async () => {
    const res = await GET(new Request('http://localhost/x'), {
      params: Promise.resolve({ ref: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando produto inativo', async () => {
    findPublicProductByRef.mockResolvedValue({
      active: false,
      id: 'p1',
      ref: 'x',
    })

    const res = await GET(new Request('http://localhost/api/products/x'), {
      params: Promise.resolve({ ref: 'x' }),
    })
    expect(res.status).toBe(404)
  })

  it('retorna produto público quando ativo', async () => {
    findPublicProductByRef.mockResolvedValue({
      active: true,
      id: 'p1',
      ref: 'curso-x',
      name: 'Curso',
      prices: [],
    })

    const res = await GET(new Request('http://localhost/api/products/curso-x'), {
      params: Promise.resolve({ ref: 'curso-x' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.product).toBeDefined()
    expect(body.product.ref).toBe('curso-x')
  })

  it('retorna 404 quando serviço sinaliza não encontrado', async () => {
    const err = new Error('não encontrado')
    ;(err as { code?: string }).code = 'NOT_FOUND'
    findPublicProductByRef.mockRejectedValue(err)

    const res = await GET(new Request('http://localhost/api/products/missing'), {
      params: Promise.resolve({ ref: 'missing' }),
    })
    expect(res.status).toBe(404)
  })
})
