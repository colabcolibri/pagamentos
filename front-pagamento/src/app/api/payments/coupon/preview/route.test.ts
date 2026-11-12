import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

vi.mock('@/lib/auth/api-context', () => ({
  getApiContext: vi.fn(),
}))

const previewCheckoutCoupon = vi.fn()

vi.mock('@/lib/payments/coupon/preview-coupon', () => ({
  previewCheckoutCoupon: (...args: unknown[]) => previewCheckoutCoupon(...args),
}))

const { getApiContext } = await import('@/lib/auth/api-context')

const priceId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

function authed() {
  vi.mocked(getApiContext).mockResolvedValue({
    user: { id: 'u1', email: 'a@b.com' },
  })
}

describe('POST /api/payments/coupon/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(getApiContext).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const res = await POST(
      new Request('http://localhost/api/payments/coupon/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          checkout_flow: 'avista',
          coupon_code: 'PROMO10',
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('retorna 400 para JSON inválido', async () => {
    authed()

    const res = await POST(
      new Request('http://localhost/api/payments/coupon/preview', {
        method: 'POST',
        body: 'x',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando preço não encontrado', async () => {
    authed()
    previewCheckoutCoupon.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Preço não encontrado',
    })

    const res = await POST(
      new Request('http://localhost/api/payments/coupon/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          checkout_flow: 'avista',
          coupon_code: 'PROMO10',
        }),
      })
    )
    expect(res.status).toBe(404)
  })

  it('retorna 400 quando cupom não aplica', async () => {
    authed()
    previewCheckoutCoupon.mockResolvedValue({
      ok: false,
      status: 400,
      error: 'Cupom inválido',
    })

    const res = await POST(
      new Request('http://localhost/api/payments/coupon/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          checkout_flow: 'parcelado',
          coupon_code: 'INVALID',
        }),
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Cupom inválido')
  })

  it('retorna preview quando cupom aplica', async () => {
    authed()
    previewCheckoutCoupon.mockResolvedValue({
      ok: true,
      body: {
        normalized_code: 'PROMO10',
        applies_to: 'avista',
        checkout_flow: 'avista',
        subtotal_cents: 10000,
        discount_cents: 1000,
        final_cents: 9000,
        discount_type: 'percent',
        discount_percent: 10,
        discount_amount_cents: null,
        coupon_public_lines: { remaining: null, valid_until: null },
      },
    })

    const res = await POST(
      new Request('http://localhost/api/payments/coupon/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: priceId,
          checkout_flow: 'avista',
          coupon_code: 'PROMO10',
        }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.final_cents).toBe(9000)
    expect(body.normalized_code).toBe('PROMO10')
    expect(body.discount_type).toBe('percent')
    expect(body.discount_percent).toBe(10)
  })
})
