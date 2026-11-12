import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const orderUuid = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const paymentUuid = 'c3d4e5f6-a7b8-9012-cdef-123456789012'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/payments/factories/service-factory', () => ({
  createServices: vi.fn(),
}))

vi.mock('@/lib/payments/admin-cancel-payment-link', () => ({
  cancelAdminPaymentLink: vi.fn(),
  isAdminPaymentConfirmedForOrderCancel: vi.fn(
    (status: string | null) => status === 'paid' || status === 'approved'
  ),
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

const { requireAdmin } = await import('@/lib/auth')
const { createAdminPaymentsClient } = await import('@/lib/db/payments-query')
const { createServices } = await import('@/lib/payments/factories/service-factory')
const { cancelAdminPaymentLink } = await import('@/lib/payments/admin-cancel-payment-link')

function buildRequest() {
  return new Request(`http://localhost/api/admin/orders/${orderUuid}/cancel`, { method: 'POST' })
}

describe('POST /api/admin/orders/[id]/cancel', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(createAdminPaymentsClient).mockReset()
    vi.mocked(createServices).mockReset()
    vi.mocked(cancelAdminPaymentLink).mockReset()
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

  it('retorna 404 quando pedido não existe', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

    expect(res.status).toBe(404)
  })

  it('retorna 200 alreadyCancelled quando pedido já está cancelado', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: orderUuid, status: 'cancelled', deleted_at: null },
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
    expect(body.alreadyCancelled).toBe(true)
    expect(cancelAdminPaymentLink).not.toHaveBeenCalled()
  })

  it('retorna 403 quando status do pedido não permite cancelar', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: orderUuid, status: 'paid', deleted_at: null },
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

    expect(res.status).toBe(403)
    expect(cancelAdminPaymentLink).not.toHaveBeenCalled()
  })

  it('retorna 409 quando cobrança Pagarme está paga', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: orderUuid, status: 'pending', deleted_at: null },
        error: null,
      }),
    }
    const mockPagarmeChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: paymentUuid, status: 'paid', payment_link_id: 'pl_1' }],
        error: null,
      }),
    }
    const mockAsaasChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'orders') return mockOrdersChain
          if (table === 'pagarme_payments') return mockPagarmeChain
          if (table === 'asaas_payments') return mockAsaasChain
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

    expect(res.status).toBe(409)
    expect(cancelAdminPaymentLink).not.toHaveBeenCalled()
  })

  it('cancela pagamentos e atualiza pedido com sucesso', async () => {
    const updateOrderStatus = vi.fn().mockResolvedValue({})
    vi.mocked(createServices).mockReturnValue({
      orderService: { updateOrderStatus },
    } as any)

    vi.mocked(cancelAdminPaymentLink).mockResolvedValue({ ok: true })

    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: orderUuid, status: 'pending', deleted_at: null },
        error: null,
      }),
    }
    const mockPagarmeChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: paymentUuid, status: 'pending', payment_link_id: 'pl_x' }],
        error: null,
      }),
    }
    const mockAsaasChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'orders') return mockOrdersChain
          if (table === 'pagarme_payments') return mockPagarmeChain
          if (table === 'asaas_payments') return mockAsaasChain
          throw new Error(`unexpected table ${table}`)
        }),
      }),
    }

    const userSupabase = { tag: 'user' }
    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'a@b.c' },
    })

    const res = await POST(buildRequest(), {
      params: Promise.resolve({ id: orderUuid }),
    })

    expect(res.status).toBe(200)
    expect(cancelAdminPaymentLink).toHaveBeenCalledTimes(1)
    expect(orderUpdate).toHaveBeenCalledWith(expect.stringContaining("SET status = 'cancelled'"), [
      orderUuid,
    ])
  })

  it('retorna 403 quando pedido está reembolsado (use webhook Asaas para refunded)', async () => {
    const mockOrdersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: orderUuid, status: 'refunded', deleted_at: null },
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

    expect(res.status).toBe(403)
    expect(cancelAdminPaymentLink).not.toHaveBeenCalled()
  })
})
