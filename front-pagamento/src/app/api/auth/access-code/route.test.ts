import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const error = vi.fn()

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error, info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@/lib/db/pool', () => ({
  withTransaction: vi.fn(async () => {
    throw new Error('smtp recusou ana@quitou.invalid')
  }),
}))
vi.mock('@/lib/email-helpers', () => ({
  sendAccessCodeEmail: vi.fn(),
}))
vi.mock('@/lib/config/env', () => ({
  serverEnv: { ACCESS_CODE_SECRET: 'segredo-de-teste' },
}))

describe('POST /api/auth/access-code', () => {
  beforeEach(() => {
    error.mockReset()
  })

  it('não grava o e-mail no log quando o envio falha', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/access-code', {
        method: 'POST',
        body: JSON.stringify({ email: 'ana@quitou.invalid', name: 'Ana' }),
      })
    )
    expect(response.status).toBe(500)
    expect(JSON.stringify(error.mock.calls)).not.toContain('ana@quitou.invalid')
  })
})
