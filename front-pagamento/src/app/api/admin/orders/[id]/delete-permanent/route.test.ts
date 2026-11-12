import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const isCurrentUserSuperAdmin = vi.fn()

vi.mock('@quitou/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@quitou/core')>()
  return {
    ...mod,
    createAdminService: vi.fn(() => ({
      isCurrentUserSuperAdmin,
    })),
  }
})

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

const orderId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('POST /api/admin/orders/[id]/delete-permanent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isCurrentUserSuperAdmin.mockResolvedValue(false)
  })

  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(
      new Request(`http://localhost/api/admin/orders/${orderId}/delete-permanent`),
      {
        params: Promise.resolve({ id: orderId }),
      }
    )
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando pedido não existe', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: true,
      user: { id: 'admin', email: 'admin@test.local' },
    })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
    })

    vi.mocked(createAdminPaymentsClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({ from }),
    } as any)

    const res = await POST(
      new Request(`http://localhost/api/admin/orders/${orderId}/delete-permanent`),
      {
        params: Promise.resolve({ id: orderId }),
      }
    )
    expect(res.status).toBe(404)
  })
})
