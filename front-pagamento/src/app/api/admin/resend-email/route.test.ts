import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const readAdminOrder = vi.fn()

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

vi.mock('@/lib/payments/admin-orders', () => ({
  readAdminOrder: (...args: unknown[]) => readAdminOrder(...args),
}))

vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/email-helpers', () => ({
  sendOrderCreatedEmailFromOrder: vi.fn().mockResolvedValue(undefined),
  sendPaymentConfirmedEmailFromOrder: vi.fn().mockResolvedValue(undefined),
}))

const { requireAdmin } = await import('@/lib/auth')

const orderId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('POST /api/admin/resend-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readAdminOrder.mockResolvedValue({ id: orderId })
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(
      new Request('http://localhost/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, emailType: 'order_created' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('reenvia email order_created com body válido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(
      new Request('http://localhost/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, emailType: 'order_created' }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
