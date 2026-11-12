import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { recordAdminAction, query, tables } = vi.hoisted(() => ({
  recordAdminAction: vi.fn(),
  query: vi.fn(),
  tables: {} as Record<string, { data: unknown; error: null; count: number }>,
}))

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))
vi.mock('@/lib/admin/audit', () => ({
  recordAdminAction,
}))
vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query }),
}))
vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: () => ({
    schema: () => ({
      from: (table: string) => {
        const result = tables[table] ?? { data: [], error: null, count: 0 }
        const builder = {
          select: () => builder,
          eq: () => builder,
          update: () => builder,
          delete: () => builder,
          maybeSingle: async () => result,
          then: (onFulfilled: (value: unknown) => unknown) =>
            Promise.resolve(result).then(onFulfilled),
        }
        return builder
      },
    }),
  }),
}))
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@/lib/payments/admin-cancel-payment-link', () => ({
  cancelAdminPaymentLink: vi.fn(async () => ({ ok: true })),
  isAdminPaymentConfirmedForOrderCancel: vi.fn(() => false),
}))
vi.mock('@quitou/core/product-webhook', () => ({
  sendPaymentConfirmedProductWebhook: vi.fn(),
}))
vi.mock('@/lib/email-helpers', () => ({
  sendPlatformSaleNotificationForOrderId: vi.fn(),
}))

const { requireAdmin } = await import('@/lib/auth')
const { POST: cancelPayment } = await import('./payments/[id]/cancel/route')
const { POST: markPaid } = await import('./orders/[id]/mark-paid/route')
const { POST: cancelOrder } = await import('./orders/[id]/cancel/route')
const { POST: deleteOrder } = await import('./orders/[id]/delete-permanent/route')
const { GET: listAudit } = await import('./audit-events/route')

const id = 'a1b2c3d4-e5f6-4789-a012-ef1234567890'

describe('auditoria de admin', () => {
  beforeEach(() => {
    recordAdminAction.mockReset()
    query.mockReset()
    query.mockResolvedValue({ rows: [] })
    for (const key of Object.keys(tables)) delete tables[key]
  })

  it('recusa cliente e não grava evento de sucesso', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'só admin' }, { status: 403 }),
    })
    const calls = [
      cancelPayment(
        new Request(`http://localhost/api/admin/payments/${id}/cancel?gateway=asaas`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ id }) }
      ),
      markPaid(
        new Request('http://localhost/api/admin/orders/' + id + '/mark-paid', { method: 'POST' }),
        {
          params: Promise.resolve({ id }),
        }
      ),
      cancelOrder(
        new Request('http://localhost/api/admin/orders/' + id + '/cancel', { method: 'POST' }),
        {
          params: Promise.resolve({ id }),
        }
      ),
      deleteOrder(
        new Request('http://localhost/api/admin/orders/' + id + '/delete-permanent', {
          method: 'POST',
        }),
        { params: Promise.resolve({ id }) }
      ),
    ]
    const responses = await Promise.all(calls)
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403])
    expect(recordAdminAction).not.toHaveBeenCalled()
  })

  it('admin que cancela pagamento grava ator, ação e alvo', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@quitou.local' },
    })
    const response = await cancelPayment(
      new Request(`http://localhost/api/admin/payments/${id}/cancel?gateway=asaas`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(response.status).toBe(200)
    expect(recordAdminAction).toHaveBeenCalledWith(expect.anything(), {
      actorId: 'admin-1',
      action: 'payment.cancel',
      targetType: 'payment',
      targetId: id,
    })
  })

  it('admin que marca pago, cancela e apaga grava as três ações', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@quitou.local' },
    })
    const call = (path: string, handler: typeof markPaid) =>
      handler(new Request(`http://localhost${path}`, { method: 'POST' }), {
        params: Promise.resolve({ id }),
      })

    tables.orders = {
      data: { id, status: 'pending', deleted_at: null, payment_method: 'pix' },
      error: null,
      count: 0,
    }
    tables.pagarme_payments = {
      data: [{ id: 'pay-1', status: 'pending', payment_method: 'pix' }],
      error: null,
      count: 0,
    }
    tables.asaas_payments = { data: [], error: null, count: 0 }
    expect((await call(`/api/admin/orders/${id}/mark-paid`, markPaid)).status).toBe(200)

    tables.pagarme_payments = { data: [], error: null, count: 0 }
    expect((await call(`/api/admin/orders/${id}/cancel`, cancelOrder)).status).toBe(200)

    tables.orders = { data: { id, status: 'cancelled' }, error: null, count: 0 }
    expect((await call(`/api/admin/orders/${id}/delete-permanent`, deleteOrder)).status).toBe(204)

    expect(recordAdminAction.mock.calls.map((entry) => entry[1].action)).toEqual([
      'order.mark_paid',
      'order.cancel',
      'order.delete',
    ])
  })

  it('cliente não lê a auditoria e admin autenticado lê a lista', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'só admin' }, { status: 403 }),
    })
    expect((await listAudit(new Request('http://localhost/api/admin/audit-events'))).status).toBe(
      403
    )

    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin-2', email: 'outro@quitou.local' },
    })
    query.mockResolvedValue({
      rows: [{ actor_id: 'admin-1', action: 'order.cancel', target_id: id, created_at: 'agora' }],
    })
    const response = await listAudit(new Request('http://localhost/api/admin/audit-events'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      events: [{ actor_id: 'admin-1', action: 'order.cancel' }],
    })
  })
})
