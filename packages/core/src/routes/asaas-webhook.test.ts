import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAsaasWebhookHandler } from './asaas-webhook'

const { claimWebhookMock } = vi.hoisted(() => ({
  claimWebhookMock: vi.fn().mockResolvedValue({
    action: 'process' as const,
    eventId: 'evt_123',
  }),
}))

vi.mock('../helpers/webhook-logger', () => ({
  logWebhookOnClient: vi.fn().mockResolvedValue('evt_123'),
  updateWebhookLogOnClient: vi.fn().mockResolvedValue(undefined),
  claimWebhookEventOnClient: claimWebhookMock,
}))

vi.mock('../logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

function buildRequest(payload: object, token = 'valid_token') {
  return new Request('http://localhost/api/payments/asaas/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': token,
    },
    body: JSON.stringify(payload),
  })
}

describe('createAsaasWebhookHandler', () => {
  const mockMaybeSingle = vi.fn()
  const mockUpdate = vi.fn()
  const mockSupabase = {
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
        or: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    }),
  }

  const defaultOptions = {
    supabase: mockSupabase as any,
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceRoleKey: 'service_key',
    validateToken: (t: string) => t === 'valid_token',
  }

  let handler: ReturnType<typeof createAsaasWebhookHandler>

  beforeEach(() => {
    vi.clearAllMocks()
    claimWebhookMock.mockResolvedValue({
      action: 'process',
      eventId: 'evt_123',
    })
    handler = createAsaasWebhookHandler(defaultOptions)
    mockMaybeSingle.mockReset()
    mockUpdate.mockReset()
  })

  it('retorna 401 quando token está ausente', async () => {
    const reqNoToken = new Request('http://localhost/api/payments/asaas/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_123' } }),
    })

    const res = await handler(reqNoToken)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Token inválido')
  })

  it('retorna 401 quando token é inválido', async () => {
    const handlerInvalid = createAsaasWebhookHandler({
      ...defaultOptions,
      validateToken: () => false,
    })
    const req = buildRequest(
      { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_123' } },
      'invalid'
    )

    const res = await handlerInvalid(req)
    expect(res.status).toBe(401)
  })

  it('retorna 200 com mensagem de payload inválido quando payload malformado', async () => {
    const req = buildRequest({ event: '' }, 'valid_token')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/inválido|ignorando/i)
  })

  it('retorna 200 "Evento não relevante" para evento ignorado', async () => {
    const req = buildRequest({
      event: 'PAYMENT_CREATED',
      payment: { id: 'pay_123' },
    })
    mockMaybeSingle.mockResolvedValueOnce({ data: null })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/não relevante|ignorando/i)
  })

  it('retorna 200 "Evento já processado" quando claim responde idempotente', async () => {
    const req = buildRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_123', billingType: 'PIX' },
    })
    claimWebhookMock.mockResolvedValueOnce({
      action: 'respond',
      message: 'Evento já processado.',
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Evento já processado.')
  })

  it('retorna 200 com mensagem quando pagamento não encontrado (PAYMENT_CONFIRMED)', async () => {
    const req = buildRequest({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_inexistente', billingType: 'PIX' },
    })

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

    const fromMock = (mockSupabase.schema as any)().from
    fromMock.mockImplementation((table: string) => {
      if (table === 'webhook_events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }
      }
      if (table === 'asaas_payments') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/não encontrado|não encontrado/i)
  })

  it('CHECKOUT_EXPIRED atualiza pagamento e pedido pending para expired', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'pay_1', status: 'pending', order_id: 'ord_1' },
      error: null,
    })
    const paymentUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const orderUpdateEq = vi.fn().mockResolvedValue({ error: null })

    const supabaseExpired = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'asaas_payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle,
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: paymentUpdateEq,
              }),
            }
          }
          if (table === 'orders') {
            return {
              update: vi.fn().mockReturnValue({
                eq: orderUpdateEq,
              }),
            }
          }
          return {}
        }),
      }),
    }

    const h = createAsaasWebhookHandler({
      ...defaultOptions,
      supabase: supabaseExpired as any,
    })

    const req = buildRequest({ event: 'CHECKOUT_EXPIRED', checkout: { id: 'cs_expire_1' } })
    const res = await h(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/expirado/i)
    expect(maybeSingle).toHaveBeenCalled()
    expect(paymentUpdateEq).toHaveBeenCalled()
    expect(orderUpdateEq).toHaveBeenCalled()
  })

  it('CHECKOUT_CREATED retorna 200 (auditoria, sem escrita no banco)', async () => {
    const req = buildRequest({ event: 'CHECKOUT_CREATED', checkout: { id: 'cs_created_1' } })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/criado/i)
  })

  it('PAYMENT_REFUNDED atualiza pagamento e pedido para refunded quando há order_id', async () => {
    const paymentRow = {
      id: 'asaas_row_1',
      status: 'paid',
      refunded_at: null,
      order_id: 'ord_ref_1',
      subscription_id: null,
      asaas_payment_id: 'pay_refund_1',
      subscriptions: null,
    }
    const paymentUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const rpcApplyRefund = vi.fn().mockResolvedValue({ error: null })

    const supabaseRefund = {
      schema: vi.fn().mockReturnValue({
        rpc: rpcApplyRefund,
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'asaas_payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: paymentRow, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: paymentUpdateEq,
              }),
            }
          }
          return {}
        }),
      }),
    }

    const h = createAsaasWebhookHandler({
      ...defaultOptions,
      supabase: supabaseRefund as any,
    })

    const req = buildRequest({
      event: 'PAYMENT_REFUNDED',
      payment: { id: 'pay_refund_1' },
    })
    const res = await h(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/sucesso/i)
    expect(paymentUpdateEq).toHaveBeenCalled()
    expect(rpcApplyRefund).toHaveBeenCalledWith('apply_refund_to_order', {
      p_order_id: 'ord_ref_1',
      p_refunded_at: expect.any(String),
    })
  })

  it('PAYMENT_REFUNDED ainda atualiza pedido quando pagamento já estava refunded (retry / conserto)', async () => {
    const paymentRow = {
      id: 'asaas_row_1',
      status: 'refunded',
      refunded_at: '2026-03-01T12:00:00.000Z',
      order_id: 'ord_ref_1',
      subscription_id: null,
      asaas_payment_id: 'pay_refund_1',
      subscriptions: null,
    }
    const paymentUpdateEq = vi.fn()
    const rpcApplyRefund = vi.fn().mockResolvedValue({ error: null })

    const supabaseRefund = {
      schema: vi.fn().mockReturnValue({
        rpc: rpcApplyRefund,
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'asaas_payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: paymentRow, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: paymentUpdateEq,
              }),
            }
          }
          return {}
        }),
      }),
    }

    const h = createAsaasWebhookHandler({
      ...defaultOptions,
      supabase: supabaseRefund as any,
    })

    const req = buildRequest({
      event: 'PAYMENT_REFUNDED',
      payment: { id: 'pay_refund_1' },
    })
    const res = await h(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/já processado/i)
    expect(paymentUpdateEq).not.toHaveBeenCalled()
    expect(rpcApplyRefund).toHaveBeenCalledWith('apply_refund_to_order', {
      p_order_id: 'ord_ref_1',
      p_refunded_at: '2026-03-01T12:00:00.000Z',
    })
  })
})
