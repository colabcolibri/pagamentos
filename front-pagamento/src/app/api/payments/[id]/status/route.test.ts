import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

vi.mock('@/lib/payments/checkout-database', () => ({
  findCheckoutSession: vi.fn(),
}))

vi.mock('@/lib/payments/payment-read', () => ({
  readOwnPaymentStatus: vi.fn(),
}))

const { findCheckoutSession } = await import('@/lib/payments/checkout-database')
const { readOwnPaymentStatus } = await import('@/lib/payments/payment-read')

function buildRequest(id: string, gateway: string) {
  return new Request(`http://localhost/api/payments/${id}/status?gateway=${gateway}`)
}

describe('GET /api/payments/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findCheckoutSession).mockResolvedValue({ userId: 'user-1', email: 'a@b.com' })
    vi.mocked(readOwnPaymentStatus).mockResolvedValue(null)
  })

  it('retorna 400 quando gateway está ausente', async () => {
    const req = new Request(`http://localhost/api/payments/${validUuid}/status`)
    const res = await GET(req, { params: Promise.resolve({ id: validUuid }) })
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando gateway é inválido', async () => {
    const res = await GET(buildRequest(validUuid, 'stripe'), {
      params: Promise.resolve({ id: validUuid }),
    })
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando id não é UUID válido', async () => {
    const res = await GET(buildRequest('invalid-id', 'asaas'), {
      params: Promise.resolve({ id: 'invalid-id' }),
    })
    expect(res.status).toBe(400)
  })

  it('retorna 401 sem sessão', async () => {
    vi.mocked(findCheckoutSession).mockResolvedValue(null)
    const res = await GET(buildRequest(validUuid, 'asaas'), {
      params: Promise.resolve({ id: validUuid }),
    })
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando o pagamento não é do usuário', async () => {
    const res = await GET(buildRequest(validUuid, 'asaas'), {
      params: Promise.resolve({ id: validUuid }),
    })
    expect(res.status).toBe(404)
    expect(readOwnPaymentStatus).toHaveBeenCalledWith('user-1', validUuid, 'asaas')
  })

  it('devolve link, boleto e pix quando existem', async () => {
    const payment = {
      status: 'pending',
      payment_method: null,
      payment_link_url: 'https://link.pagarme.com/xyz',
      boleto_url: 'https://boleto.example/1',
      boleto_line: '12345',
      boleto_barcode: null,
      pix_qr_code: 'qr',
      pix_code: 'copia',
    }
    vi.mocked(readOwnPaymentStatus).mockResolvedValue(payment)
    const res = await GET(buildRequest(validUuid, 'pagarme'), {
      params: Promise.resolve({ id: validUuid }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ payment })
  })
})
