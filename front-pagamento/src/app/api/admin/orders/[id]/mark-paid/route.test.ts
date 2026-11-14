import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const orderUuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const paymentUuid = 'c3d4e5f6-a7b8-9012-cdef-123456789012'

vi.mock('@quitou/core/product-webhook', () => ({
  sendPaymentConfirmedProductWebhook: vi.fn().mockResolvedValue(undefined),
}))

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

const { orderUpdate } = vi.hoisted(() => ({
  orderUpdate: vi.fn().mockResolvedValue({ rows: [] }),
}))

vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query: orderUpdate }),
}))

vi.mock('@/lib/config/env', () => ({
  publicEnv: { NEXT_PUBLIC_AUTH_COOKIE_NAME: 'quitou_auth_token' },
  serverEnv: { NODE_ENV: 'test' },
}))

const { requireAdmin } = await import('@/lib/auth')
const { createAdminPaymentsClient } = await import('@/lib/db/payments-query')
const { sendPaymentConfirmedProductWebhook } = await import('@quitou/core/product-webhook')

function buildRequest() {
  return new Request(`http://localhost/api/admin/orders/${orderUuid}/mark-paid`, { method: 'POST' })
}

describe('POST /api/admin/orders/[id]/mark-paid', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(createAdminPaymentsClient).mockReset()
    vi.mocked(sendPaymentConfirmedProductWebhook).mockClear()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: orderUuid }),
    })

    expect(res.status).toBe(401)
  })

  it('retorna 200 alreadyPaid quando pedido já está pago', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: orderUuid,
          status: 'paid',
          deleted_at: null,
          payment_gateway: 'pagarme',
          payment_method: 'pix',
          subscription_id: null,
          order_type: 'one_time',
        },
        error: null,
      }),
    }
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'orders') return mockOrdersChain
          throw new Error(`unexpected table ${table}`)
        }),
      }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'u1', email: 'a@b.c' },
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: orderUuid }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alreadyPaid).toBe(true)
    expect(sendPaymentConfirmedProductWebhook).not.toHaveBeenCalled()
  })

  it('retorna 200 e atualiza quando há cobrança Pagar.me pendente', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: orderUuid,
          status: 'pending',
          deleted_at: null,
          payment_gateway: 'pagarme',
          payment_method: null,
          subscription_id: null,
          order_type: 'one_time',
        },
        error: null,
      }),
    }

    const mockPgSelectChain = {
      eq: vi.fn().mockResolvedValue({
        data: [{ id: paymentUuid, status: 'pending', payment_method: null }],
        error: null,
      }),
    }
    const mockPgUpdateChain = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    const mockAsaasSelectChain = {
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    const mockFrom = vi.fn((table: string) => {
      if (table === 'orders') return mockOrdersChain
      if (table === 'pagarme_payments') {
        return {
          select: vi.fn().mockReturnValue(mockPgSelectChain),
          update: vi.fn().mockReturnValue(mockPgUpdateChain),
        }
      }
      if (table === 'asaas_payments') {
        return {
          select: vi.fn().mockReturnValue(mockAsaasSelectChain),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: mockFrom,
      }),
    }

    const updateOrderStatus = vi.fn().mockResolvedValue({})

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'a@b.c' },
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: orderUuid }),
    })

    expect(res.status).toBe(200)
    expect(orderUpdate).toHaveBeenCalledWith(expect.stringContaining("SET status = 'paid'"), [
      orderUuid,
      expect.any(String),
    ])
    expect(sendPaymentConfirmedProductWebhook).toHaveBeenCalledTimes(1)
  })
})
