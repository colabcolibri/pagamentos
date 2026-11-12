import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/config/env', () => ({
  publicEnv: {
    NEXT_PUBLIC_AUTH_COOKIE_NAME: 'quitou_auth_token',
    NEXT_PUBLIC_COOKIE_DOMAIN: undefined,
  },
  serverEnv: {
    PAGARME_SECRET_KEY: 'sk_test_fake',
    PAGARME_ENVIRONMENT: 'sandbox',
    ASAAS_API_KEY: '$fake',
    ASAAS_ENVIRONMENT: 'sandbox',
    NODE_ENV: 'test',
  },
}))

vi.mock('@quitou/core', () => ({
  createPagarmeService: vi.fn(),
  createAsaasService: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query: vi.fn().mockResolvedValue({ rows: [] }) }),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: vi.fn(),
}))

const { requireAdmin } = await import('@/lib/auth')
const { createAdminPaymentsClient } = await import('@/lib/db/payments-query')
const { createPagarmeService, createAsaasService } = await import('@quitou/core')

function buildRequest(gateway: string) {
  return new Request(`http://localhost/api/admin/payments/${uuid}/cancel?gateway=${gateway}`, {
    method: 'POST',
  })
}

describe('POST /api/admin/payments/[id]/cancel', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(createAdminPaymentsClient).mockReset()
    vi.mocked(createPagarmeService).mockReset()
    vi.mocked(createAsaasService).mockReset()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(401)
  })

  it('retorna 400 quando gateway está ausente', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const req = new Request(`http://localhost/api/admin/payments/${uuid}/cancel`)
    const res = await POST(req, {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/gateway obrigatório/)
  })

  it('retorna 404 quando pagamento não existe', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Pagamento não encontrado')
  })

  it('retorna 403 quando status é paid', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: uuid,
        status: 'paid',
        payment_link_id: 'pl_123',
      },
      error: null,
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/já realizado/)
  })

  it('retorna 400 quando status já é cancelled', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: uuid,
        status: 'cancelled',
        payment_link_id: 'pl_123',
      },
      error: null,
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/já foi cancelada/)
  })

  it('retorna 200 e status cancelled quando Pagar.me cancela com sucesso', async () => {
    const mockCancel = vi.fn().mockResolvedValue(undefined)
    vi.mocked(createPagarmeService).mockReturnValue({
      cancelPaymentLink: mockCancel,
    } as any)

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: uuid,
        status: 'pending',
        payment_link_id: 'pl_abc',
      },
      error: null,
    })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
      }),
      update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(200)
    expect(mockCancel).toHaveBeenCalledWith('pl_abc')
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.status).toBe('cancelled')
  })

  it('retorna 200 quando Asaas (pagamento único) cancela com sucesso', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)
    vi.mocked(createAsaasService).mockReturnValue({
      deletePayment: mockDelete,
    } as any)

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: uuid,
        status: 'pending',
        asaas_payment_id: 'pay_123',
        asaas_installment_id: null,
      },
      error: null,
    })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
      }),
      update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    }

    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await POST(buildRequest('asaas'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith('pay_123')
  })
})
