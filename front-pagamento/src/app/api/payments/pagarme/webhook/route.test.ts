import type { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const stubHandler = vi.fn()

vi.mock('@quitou/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@quitou/core')>()
  return {
    ...mod,
    createPagarmeWebhookHandler: vi.fn(() => stubHandler),
  }
})

vi.mock('@quitou/core/product-webhook', () => ({
  sendPaymentConfirmedProductWebhook: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email-helpers', () => ({
  sendPaymentConfirmedEmailFromOrder: vi.fn().mockResolvedValue(undefined),
  sendOrderCreatedEmailFromOrder: vi.fn().mockResolvedValue(undefined),
}))

const { POST } = await import('./route')

describe('POST /api/payments/pagarme/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubHandler.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  })

  it('delega ao handler configurado pelo core', async () => {
    const req = new Request('http://localhost/api/payments/pagarme/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order.paid' }),
    })
    const res = await POST(req as unknown as NextRequest)
    expect(stubHandler).toHaveBeenCalledWith(req)
    expect(res.status).toBe(200)
  })
})
