import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAsaasCheckoutParceladoHandler } from './asaas-checkout-parcelado'

const mockGetPriceWithProduct = vi.fn()
const mockFindSession = vi.fn()
const mockSendOtpAndCreateUserIfNeeded = vi.fn()

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
    createCheckout: vi.fn().mockResolvedValue({
      id: 'checkout_session_123',
    }),
    getCheckoutUrl: vi.fn((id: string) => `https://sandbox.asaas.com/checkoutSession/show?id=${id}`),
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
  installments: 3,
}

const mockPrice = {
  id: validPriceId,
  amount: 99900,
  recurring: false,
  metadata: { max_installments: 12 },
}
const mockProduct = {
  id: 'prod_123',
  name: 'Produto Teste',
  ref: 'prod-ref',
  description: 'Descrição',
  refund_policy: {},
  metadata: {},
}

function buildRequest(body: object) {
  return new Request('http://localhost/api/payments/asaas/checkout/parcelado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createTestDatabase() {
  return {
    query: async (sql: string) => {
      if (sql.includes('UPDATE payments.profiles')) return { rows: [{ id: 'user_123' }] }
      return { rows: [] }
    },
    transaction: async (
      fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<void>
    ) => {
      await fn({
        query: async () => ({ rows: [] }),
      })
    },
  }
}

describe('createAsaasCheckoutParceladoHandler', () => {
  const defaultOptions = {
    database: createTestDatabase(),
    findSession: (...args: unknown[]) => mockFindSession(...args),
    asaasApiKey: '$fake_key',
    asaasEnvironment: 'sandbox' as const,
    appUrl: 'http://localhost:3000',
    minutesToExpire: 60,
  }

  let handler: ReturnType<typeof createAsaasCheckoutParceladoHandler>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindSession.mockResolvedValue(null)
    handler = createAsaasCheckoutParceladoHandler(defaultOptions)
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
  })

  it('retorna 400 quando installments < 2', async () => {
    const req = buildRequest({
      ...validBody,
      installments: 1,
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
  })

  it('retorna 200 com checkout criado quando autenticado', async () => {
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
    expect(body.installments).toBe(3)
  })
})
