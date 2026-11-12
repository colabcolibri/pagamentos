import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const findPublicProductsByRefs = vi.fn()

vi.mock('@/lib/payments/catalog/postgres-catalog', () => ({
  findPublicProductsByRefs: (...args: unknown[]) => findPublicProductsByRefs(...args),
}))

describe('GET /api/products/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findPublicProductsByRefs.mockResolvedValue([])
  })

  it('retorna 400 quando refs ausente', async () => {
    const res = await GET(new Request('http://localhost/api/products/batch'))
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando validação de refs falha', async () => {
    const res = await GET(new Request('http://localhost/api/products/batch?refs='))
    expect(res.status).toBe(400)
  })

  it('retorna produtos na ordem solicitada', async () => {
    findPublicProductsByRefs.mockResolvedValue([
      { ref: 'b', active: true, id: '2', name: 'B', prices: [] },
      { ref: 'a', active: true, id: '1', name: 'A', prices: [] },
    ])

    const res = await GET(new Request('http://localhost/api/products/batch?refs=a,b,a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.products).toHaveLength(2)
    expect(body.products[0].ref).toBe('a')
    expect(body.products[1].ref).toBe('b')
    expect(findPublicProductsByRefs).toHaveBeenCalledWith(['a', 'b'])
  })
})
