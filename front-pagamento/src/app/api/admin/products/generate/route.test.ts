import { NextResponse } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

import { POST } from './route'

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

describe('POST /api/admin/products/generate', () => {
  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(
      new Request('http://localhost/api/admin/products/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'X',
          description: '',
          priceInfo: 'info',
          priceType: 'one_time',
        }),
      })
    )
    expect(res.status).toBe(401)
  })
})
