import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

describe('GET /api/cep', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          cep: '01310100',
          logradouro: 'Av Paulista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      })
    )
  })

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch)
    vi.unstubAllGlobals()
  })

  it('retorna 400 quando CEP tem menos de 8 dígitos', async () => {
    const res = await GET(new Request('http://localhost/api/cep?cep=123'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/8 dígitos/)
  })

  it('retorna 400 quando CEP contém letras após normalização', async () => {
    const res = await GET(new Request('http://localhost/api/cep?cep=abcdefgh'))
    expect(res.status).toBe(400)
  })

  it('retorna JSON com endereço quando CEP é válido', async () => {
    const res = await GET(new Request('http://localhost/api/cep?cep=01310-100'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cep).toBe('01310100')
    expect(body.logradouro).toBe('Av Paulista')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01310100/json/',
      expect.objectContaining({ next: { revalidate: 86400 } })
    )
  })

  it('retorna 502 quando resposta HTTP não é ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const res = await GET(new Request('http://localhost/api/cep?cep=01310100'))
    expect(res.status).toBe(502)
  })

  it('retorna 502 quando fetch lança', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('network'))

    const res = await GET(new Request('http://localhost/api/cep?cep=01310100'))
    expect(res.status).toBe(502)
  })
})
