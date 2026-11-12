import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const loadPublicProductByPrice = vi.fn()
const loadGatewayConfig = vi.fn()

vi.mock('@/lib/payments/product/load-public-product-by-price', () => ({
  loadPublicProductByPrice: (...args: unknown[]) => loadPublicProductByPrice(...args),
}))

vi.mock('@/lib/payments/gateway-config', () => ({
  loadGatewayConfig: (...args: unknown[]) => loadGatewayConfig(...args),
}))

const priceId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('GET /api/products/by-price/[priceId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    loadGatewayConfig.mockImplementation(async () => ({
      productsByPriceApiKey: process.env.PRODUCTS_BY_PRICE_API_KEY?.trim() || null,
    }))
    loadPublicProductByPrice.mockResolvedValue({
      ok: true,
      product: { id: 'p1', ref: 'r', name: 'Produto', active: true, prices: [] },
      price_ui: null,
    })
  })

  it('retorna 401 quando API key é exigida e não enviada', async () => {
    vi.stubEnv('PRODUCTS_BY_PRICE_API_KEY', 'segredo')

    const res = await GET(new Request(`http://localhost/api/products/by-price/${priceId}`), {
      params: Promise.resolve({ priceId }),
    })
    expect(res.status).toBe(401)
  })

  it('retorna 401 quando API key é inválida', async () => {
    vi.stubEnv('PRODUCTS_BY_PRICE_API_KEY', 'segredo')

    const res = await GET(
      new Request(`http://localhost/api/products/by-price/${priceId}`, {
        headers: { 'x-api-key': 'outro' },
      }),
      { params: Promise.resolve({ priceId }) }
    )
    expect(res.status).toBe(401)
  })

  it('aceita x-api-key quando PRODUCTS_BY_PRICE_API_KEY está definida', async () => {
    vi.stubEnv('PRODUCTS_BY_PRICE_API_KEY', 'segredo')

    const res = await GET(
      new Request(`http://localhost/api/products/by-price/${priceId}`, {
        headers: { 'x-api-key': 'segredo' },
      }),
      { params: Promise.resolve({ priceId }) }
    )
    expect(res.status).toBe(200)
  })

  it('retorna 404 quando loadPublicProductByPrice falha', async () => {
    loadPublicProductByPrice.mockResolvedValue({
      ok: false,
      error: 'Preço não encontrado',
      code: 'NOT_FOUND',
    })

    const res = await GET(new Request(`http://localhost/api/products/by-price/${priceId}`), {
      params: Promise.resolve({ priceId }),
    })
    expect(res.status).toBe(404)
  })

  it('retorna 400 quando loadPublicProductByPrice sinaliza bad request', async () => {
    loadPublicProductByPrice.mockResolvedValue({
      ok: false,
      error: 'Price ID é obrigatório',
      code: 'BAD_REQUEST',
    })

    const res = await GET(new Request(`http://localhost/api/products/by-price/${priceId}`), {
      params: Promise.resolve({ priceId }),
    })
    expect(res.status).toBe(400)
  })
})
