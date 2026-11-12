import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAsaasCheckoutAvistaHandler } from './asaas-checkout-avista'

const mockGetPriceWithProduct = vi.fn()
const mockFindSession = vi.fn()
const mockSendOtpAndCreateUserIfNeeded = vi.fn()
const mockCreateCheckout = vi.fn()
const mockGetCheckoutUrl = vi.fn()

type Captured = { sql: string; params: unknown[] }

function createTestDatabase() {
  let pending: Record<string, unknown> | null = null
  const inserts: Captured[] = []
  return {
    inserts,
    setPending(row: Record<string, unknown> | null) {
      pending = row
    },
    query: async (sql: string) => {
      if (sql.includes('UPDATE payments.profiles')) return { rows: [{ id: 'user_123' }] }
      if (sql.includes('FROM payments.asaas_payments')) return { rows: pending ? [pending] : [] }
      return { rows: [] }
    },
    transaction: async (
      fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<void>
    ) => {
      await fn({
        query: async (sql: string, params?: unknown[]) => {
          inserts.push({ sql, params: params ?? [] })
          return { rows: [] }
        },
      })
    },
  }
}

vi.mock('../helpers/checkout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../helpers/checkout')>()
  return {
    ...actual,
    createSupabaseUserClient: vi.fn(() => ({})),
    getPriceWithProduct: (...args: unknown[]) => mockGetPriceWithProduct(...args),
    createPendingSubscription: vi.fn().mockResolvedValue({
      subscriptionId: 'sub_123',
      error: null,
    }),
  }
})

vi.mock('../helpers/auth', () => ({
  sendOtpAndCreateUserIfNeeded: (...args: unknown[]) =>
    mockSendOtpAndCreateUserIfNeeded(...args),
}))

vi.mock('../logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../payments/services', () => ({
  createAsaasService: () => ({
    createCheckout: (...args: unknown[]) => mockCreateCheckout(...args),
    getCheckoutUrl: (id: string) => mockGetCheckoutUrl(id),
  }),
}))

const validPriceId = '550e8400-e29b-41d4-a716-446655440000'
const validBody = {
  price_id: validPriceId,
  customer_info: {
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '11999998888',
    person_type: 'fisica' as const,
    cpf: '123.456.789-09',
    cep: '01310-100',
    address: 'Av. Paulista',
    address_number: '1000',
    city: 'São Paulo',
    state: 'SP',
  },
}

const mockPrice = {
  id: validPriceId,
  amount: 9990,
  recurring: false,
  metadata: {},
}
const mockProduct = {
  id: 'prod_123',
  name: 'Produto Teste',
  ref: 'prod-ref',
  refund_policy: {},
  metadata: {},
}

function buildRequest(body: object) {
  return new NextRequest('http://localhost/api/payments/asaas/checkout/avista', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('createAsaasCheckoutAvistaHandler', () => {
  const database = createTestDatabase()

  const defaultOptions = {
    database,
    findSession: (...args: unknown[]) => mockFindSession(...args),
    asaasApiKey: '$fake_key',
    asaasEnvironment: 'sandbox' as const,
    appUrl: 'http://localhost:3000',
    minutesToExpire: 60,
  }

  let handler: ReturnType<typeof createAsaasCheckoutAvistaHandler>

  beforeEach(() => {
    vi.clearAllMocks()
    database.inserts.length = 0
    database.setPending(null)
    mockFindSession.mockResolvedValue(null)
    handler = createAsaasCheckoutAvistaHandler(defaultOptions)
    mockCreateCheckout.mockResolvedValue({ id: 'checkout_session_123' })
    mockGetCheckoutUrl.mockImplementation((id: string) => `https://sandbox.asaas.com/checkoutSession/show?id=${id}`)
  })

  it('retorna 400 quando body é inválido (price_id não UUID)', async () => {
    const req = buildRequest({
      ...validBody,
      price_id: 'not-a-uuid',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.details).toBeDefined()
  })

  it('retorna 400 quando customer_info está incompleto', async () => {
    const req = buildRequest({
      price_id: validPriceId,
      customer_info: { name: '', email: 'invalid' },
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando preço/produto não encontrado', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: null,
      product: null,
      error: { message: 'Preço não encontrado' },
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/não encontrado|Erro ao buscar/)
  })

  it('retorna 202 quando usuário não autenticado e OTP enviado', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: mockPrice,
      product: mockProduct,
      error: null,
    })
    mockFindSession.mockResolvedValue(null)
    mockSendOtpAndCreateUserIfNeeded.mockResolvedValue({
      emailSent: true,
      message: 'Código enviado',
      userExists: false,
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.action).toBe('email_verification_required')
    expect(body.message).toBeDefined()
  })

  it('retorna 200 com checkout reutilizado quando existe pagamento pendente', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: mockPrice,
      product: mockProduct,
      error: null,
    })
    mockFindSession.mockResolvedValue({
      userId: 'user_123',
      email: 'joao@example.com',
    })
    database.setPending({
      id: 'pay_uuid_1',
      invoice_url: 'https://sandbox.asaas.com/checkoutSession/show?id=cs_abc',
      asaas_checkout_id: 'cs_abc',
      subscription_id: null,
      order_id: 'order_1',
      deleted_at: null,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reused).toBe(true)
    expect(body.payment).toBeDefined()
    expect(body.payment.id).toBe('pay_uuid_1')
    expect(body.payment.invoice_url).toBe('https://sandbox.asaas.com/checkoutSession/show?id=cs_abc')
  })

  it('não reutiliza checkout quando orders.expires_at já passou e cria nova sessão', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: mockPrice,
      product: mockProduct,
      error: null,
    })
    mockFindSession.mockResolvedValue({
      userId: 'user_123',
      email: 'joao@example.com',
    })
    database.setPending({
      id: 'pay_uuid_old',
      invoice_url: 'https://sandbox.asaas.com/checkoutSession/show?id=cs_old',
      asaas_checkout_id: 'cs_old',
      subscription_id: null,
      order_id: 'order_old',
      deleted_at: null,
      expires_at: '2000-01-01T00:00:00.000Z',
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reused).toBeUndefined()
    expect(mockCreateCheckout).toHaveBeenCalled()
    expect(body.payment.invoice_url).toContain('checkout_session_123')
  })

  it('retorna 200 e cria checkout com sucesso', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: mockPrice,
      product: mockProduct,
      error: null,
    })
    mockFindSession.mockResolvedValue({
      userId: 'user_123',
      email: 'joao@example.com',
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payment).toBeDefined()
    expect(body.payment.invoice_url).toContain('checkoutSession/show')
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        billingTypes: ['PIX', 'CREDIT_CARD'],
        chargeTypes: ['DETACHED'],
        items: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            value: 99.9,
            quantity: 1,
          }),
        ]),
      })
    )
  })

  it('insere order com payment_method spot e metadata.billing_type PIX', async () => {
    mockGetPriceWithProduct.mockResolvedValue({
      price: mockPrice,
      product: mockProduct,
      error: null,
    })
    mockFindSession.mockResolvedValue({
      userId: 'user_123',
      email: 'joao@example.com',
    })
    const req = buildRequest(validBody)
    const res = await handler(req)
    expect(res.status).toBe(200)

    expect(database.inserts).toHaveLength(2)
    const orderInsert = database.inserts[0]!
    expect(orderInsert.sql).toContain('INSERT INTO payments.orders')
    expect(orderInsert.params).toContain('spot')
    expect(JSON.stringify(orderInsert.params)).toContain('"billing_type":"PIX"')
    const paymentInsert = database.inserts[1]!
    expect(paymentInsert.sql).toContain('INSERT INTO payments.asaas_payments')
    expect(paymentInsert.params).toContain('PIX')
  })
})
