import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

vi.mock('@/lib/payments/checkout-database', () => ({
  findCheckoutSession: vi.fn(),
}))

vi.mock('@/lib/payments/payment-read', () => ({
  readOwnPaymentConfirmation: vi.fn(),
}))

const { findCheckoutSession } = await import('@/lib/payments/checkout-database')
const { readOwnPaymentConfirmation } = await import('@/lib/payments/payment-read')

function req(url: string) {
  return new Request(url)
}

describe('GET /api/payments/[id]/confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findCheckoutSession).mockResolvedValue({ userId: 'user-1', email: 'a@b.com' })
    vi.mocked(readOwnPaymentConfirmation).mockResolvedValue(null)
  })

  it('retorna 400 quando id não é UUID', async () => {
    const res = await GET(
      req('http://localhost/api/payments/not-uuid/confirmation?gateway=pagarme'),
      {
        params: Promise.resolve({ id: 'not-uuid' }),
      }
    )
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando gateway ausente', async () => {
    const res = await GET(req(`http://localhost/api/payments/${validUuid}/confirmation`), {
      params: Promise.resolve({ id: validUuid }),
    })
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando o pagamento não é do usuário', async () => {
    const res = await GET(
      req(`http://localhost/api/payments/${validUuid}/confirmation?gateway=pagarme`),
      { params: Promise.resolve({ id: validUuid }) }
    )
    expect(res.status).toBe(404)
    expect(readOwnPaymentConfirmation).toHaveBeenCalledWith('user-1', validUuid, 'pagarme')
  })

  it('retorna resumo para pagarme sem pedido vinculado', async () => {
    vi.mocked(readOwnPaymentConfirmation).mockResolvedValue({
      order_id: null,
      amount_cents: 1990,
      payment_method: 'pix',
      metadata: {},
      product_id: null,
      installments: null,
      product_name: null,
      product_metadata: null,
      price_metadata: null,
    })
    const res = await GET(
      req(`http://localhost/api/payments/${validUuid}/confirmation?gateway=pagarme`),
      { params: Promise.resolve({ id: validUuid }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount_cents).toBe(1990)
    expect(body.payment_method).toBe('PIX')
  })

  it('retorna resumo para asaas com parcelas', async () => {
    vi.mocked(readOwnPaymentConfirmation).mockResolvedValue({
      order_id: null,
      amount_cents: 5000,
      payment_method: 'credit_card',
      installments: 3,
      product_id: null,
      product_name: null,
      product_metadata: null,
      price_metadata: null,
    })
    const res = await GET(
      req(`http://localhost/api/payments/${validUuid}/confirmation?gateway=asaas`),
      { params: Promise.resolve({ id: validUuid }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.installments).toBe(3)
    expect(body.payment_method).toBe('Cartão de crédito')
  })
})
