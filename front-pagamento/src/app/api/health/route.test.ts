import { describe, expect, it } from 'vitest'

import { GET } from './route'

describe('GET /api/health', () => {
  it('retorna 200 e body { ok: true }', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })
})
