import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminPaymentsClient } from '@/lib/db/payments-query'

import { DELETE } from './route'

const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: vi.fn(),
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

const { requireAdmin } = await import('@/lib/auth')

function buildRequest(gateway: string) {
  return new Request(`http://localhost/api/admin/payments/${uuid}?gateway=${gateway}`, {
    method: 'DELETE',
  })
}

describe('DELETE /api/admin/payments/[id]', () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(createAdminPaymentsClient).mockReset()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await DELETE(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(401)
  })

  it('retorna 400 quando gateway está ausente', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const req = new Request(`http://localhost/api/admin/payments/${uuid}`)
    const res = await DELETE(req, {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/gateway obrigatório/)
  })

  it('retorna 400 quando gateway é inválido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })

    const res = await DELETE(buildRequest('stripe'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(400)
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

    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })
    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)

    const res = await DELETE(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Pagamento não encontrado')
  })

  it('retorna 403 quando status não é cancelled', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: uuid, status: 'pending' },
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

    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })
    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)

    const res = await DELETE(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/Cancele o link de pagamento primeiro/)
  })

  it('retorna 204 quando status é cancelled e delete sucede', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: uuid, status: 'cancelled' },
      error: null,
    })
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
      }),
      delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
    })
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    }

    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })
    vi.mocked(createAdminPaymentsClient).mockReturnValue(mockSupabase as any)

    const res = await DELETE(buildRequest('pagarme'), {
      params: Promise.resolve({ id: uuid }),
    })

    expect(res.status).toBe(204)
    expect(mockDeleteEq).toHaveBeenCalledWith('id', uuid)
  })
})
