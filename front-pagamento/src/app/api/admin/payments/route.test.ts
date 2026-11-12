import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

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

vi.mock('@/lib/db/payments-query', () => ({
  createAdminPaymentsClient: vi.fn(),
}))

const { requireAdmin } = await import('@/lib/auth')
const { createAdminPaymentsClient } = await import('@/lib/db/payments-query')

function mockListChain(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  }
}

describe('GET /api/admin/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/admin/payments'))
    expect(res.status).toBe(401)
  })

  it('combina pagarme e asaas e ordena por created_at', async () => {
    const older = '2024-01-01T00:00:00.000Z'
    const newer = '2025-01-01T00:00:00.000Z'
    const pagarme = mockListChain([{ id: 'p1', created_at: older, status: 'paid' }])
    const asaas = mockListChain([{ id: 'a1', created_at: newer, status: 'pending' }])

    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: {} as any,
    })
    vi.mocked(createAdminPaymentsClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'pagarme_payments') return pagarme
          if (table === 'asaas_payments') return asaas
          throw new Error(`unexpected table ${table}`)
        }),
      }),
    } as any)

    const res = await GET(new Request('http://localhost/api/admin/payments'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payments).toHaveLength(2)
    expect(body.payments[0].payment_gateway).toBe('asaas')
    expect(body.payments[0].created_at).toBe(newer)
    expect(body.payments[1].payment_gateway).toBe('pagarme')
  })
})
