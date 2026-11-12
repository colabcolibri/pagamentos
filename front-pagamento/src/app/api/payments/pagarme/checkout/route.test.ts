import type { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const stubHandler = vi.fn()

vi.mock('@quitou/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@quitou/core')>()
  return {
    ...mod,
    createPagarmeCheckoutHandler: vi.fn(() => stubHandler),
  }
})

const { POST } = await import('./route')

describe('POST /api/payments/pagarme/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubHandler.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://link.pagarme.test' }), { status: 200 })
    )
  })

  it('delega ao handler do core', async () => {
    const req = new Request('http://localhost/api/payments/pagarme/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    })
    const res = await POST(req as unknown as NextRequest)
    expect(stubHandler).toHaveBeenCalledWith(req)
    expect(res.status).toBe(200)
  })
})
