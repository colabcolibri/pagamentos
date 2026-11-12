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

const productId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('POST /api/admin/products/[id]/edit-with-ai', () => {
  it('retorna 401 quando não é admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(
      new Request(`http://localhost/api/admin/products/${productId}/edit-with-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: 'x'.repeat(60) }),
      }),
      { params: Promise.resolve({ id: productId }) }
    )
    expect(res.status).toBe(401)
  })
})
