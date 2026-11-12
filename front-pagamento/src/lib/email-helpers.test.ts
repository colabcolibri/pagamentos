import { sendOrderCreatedEmail, sendPaymentConfirmedEmail } from '@quitou/core/email'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatPaymentMethod,
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from './email-helpers'

vi.mock('@quitou/core/email', () => ({
  sendOrderCreatedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPlatformSaleNotificationEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('formatPaymentMethod', () => {
  it('mapeia spot para "PIX ou cartão"', () => {
    expect(formatPaymentMethod('spot')).toBe('PIX ou cartão')
  })

  it('mapeia pix para "PIX"', () => {
    expect(formatPaymentMethod('pix')).toBe('PIX')
  })

  it('mapeia boleto para "Boleto"', () => {
    expect(formatPaymentMethod('boleto')).toBe('Boleto')
  })

  it('mapeia credit_card para "Cartão de crédito"', () => {
    expect(formatPaymentMethod('credit_card')).toBe('Cartão de crédito')
  })

  it('retorna N/A para null', () => {
    expect(formatPaymentMethod(null)).toBe('N/A')
  })

  it('retorna N/A para undefined', () => {
    expect(formatPaymentMethod(undefined)).toBe('N/A')
  })

  it('retorna N/A para string vazia', () => {
    expect(formatPaymentMethod('')).toBe('N/A')
  })

  it('retorna o valor original para método desconhecido', () => {
    expect(formatPaymentMethod('debit_card')).toBe('debit_card')
  })
})

describe('sendOrderCreatedEmailFromOrder', () => {
  const orderWithMetadata = {
    id: 'order_123',
    user_id: 'user_456',
    price_id: 'price_789',
    status: 'pending',
    payment_method: 'spot',
    payment_gateway: 'asaas',
    amount_cents: 9990,
    metadata: {
      payment_link_url: 'https://checkout.asaas.com/xxx',
      billing_type: 'PIX',
    },
    prices: {
      id: 'price_789',
      amount: 9990,
      currency: 'BRL',
      recurring: false,
      interval: null,
      interval_count: null,
      product_id: 'prod_1',
      email_addon: null,
      products: {
        id: 'prod_1',
        name: 'Produto Teste',
        description: 'Descrição',
      },
    },
  }

  const userData = {
    id: 'user_456',
    email: 'user@example.com',
    name: 'User',
  }

  function createMockSupabase() {
    const mockFrom = vi.fn()
    const mockSchemaFrom = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: orderWithMetadata, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected from(${table})`)
    })

    mockSchemaFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: userData, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected schema().from(${table})`)
    })

    return {
      from: mockFrom,
      schema: () => ({ from: mockSchemaFrom }),
    } as any
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendOrderCreatedEmail).mockResolvedValue({ success: true })
  })

  it('passa billing_type do metadata para sendOrderCreatedEmail', async () => {
    const supabase = createMockSupabase()

    await sendOrderCreatedEmailFromOrder(supabase, 'order_123')

    expect(sendOrderCreatedEmail).toHaveBeenCalledWith(
      expect.anything(),
      'prod_1',
      expect.objectContaining({
        paymentMethod: 'PIX ou cartão',
        paymentInfo: expect.objectContaining({
          billingType: 'PIX',
          paymentLinkUrl: 'https://checkout.asaas.com/xxx',
          paymentGateway: 'asaas',
        }),
      }),
      undefined,
      undefined
    )
  })

  it('formata payment_method spot como "PIX ou cartão" no email', async () => {
    const supabase = createMockSupabase()

    await sendOrderCreatedEmailFromOrder(supabase, 'order_123')

    expect(sendOrderCreatedEmail).toHaveBeenCalledWith(
      expect.anything(),
      'prod_1',
      expect.objectContaining({
        paymentMethod: 'PIX ou cartão',
      }),
      undefined,
      undefined
    )
  })

  it('usa amount_cents do pedido no priceDisplay quando há desconto vs preço de catálogo', async () => {
    const discountedOrder = {
      ...orderWithMetadata,
      amount_cents: 7990,
      prices: {
        ...orderWithMetadata.prices,
        amount: 9990,
      },
    }
    const mockFrom = vi.fn()
    const mockSchemaFrom = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: discountedOrder, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected from(${table})`)
    })
    mockSchemaFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'user_456', email: 'user@example.com', name: 'User' },
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected schema().from(${table})`)
    })
    const supabase = {
      from: mockFrom,
      schema: () => ({ from: mockSchemaFrom }),
    } as any

    await sendOrderCreatedEmailFromOrder(supabase, 'order_123')

    expect(sendOrderCreatedEmail).toHaveBeenCalledWith(
      expect.anything(),
      'prod_1',
      expect.objectContaining({
        priceDisplay: 'R$ 79,90',
      }),
      undefined,
      undefined
    )
  })

  it('não envia pedido criado se amount_cents for inválido (sem fallback)', async () => {
    const badOrder = {
      ...orderWithMetadata,
      amount_cents: null as unknown as number,
    }
    const mockFrom = vi.fn()
    const mockSchemaFrom = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: badOrder, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected from(${table})`)
    })
    mockSchemaFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'user_456', email: 'user@example.com', name: 'User' },
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected schema().from(${table})`)
    })
    const supabase = {
      from: mockFrom,
      schema: () => ({ from: mockSchemaFrom }),
    } as any

    await sendOrderCreatedEmailFromOrder(supabase, 'order_123')

    expect(sendOrderCreatedEmail).not.toHaveBeenCalled()
  })
})

describe('sendPaymentConfirmedEmailFromOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendPaymentConfirmedEmail).mockResolvedValue({ success: true })
  })

  it('não envia se amount_cents for inválido (sem fallback)', async () => {
    const badOrder = {
      id: 'order_123',
      user_id: 'user_456',
      price_id: 'price_789',
      status: 'paid',
      payment_method: 'pix',
      amount_cents: undefined as unknown as number,
      prices: {
        id: 'price_789',
        amount: 9990,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        product_id: 'prod_1',
        email_addon: null,
        products: { id: 'prod_1', name: 'P', description: '' },
      },
    }
    const mockFrom = vi.fn()
    const mockSchemaFrom = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: badOrder, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected from(${table})`)
    })
    mockSchemaFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'user_456', email: 'u@e.com', name: 'U' },
                  error: null,
                }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected schema().from(${table})`)
    })

    await sendPaymentConfirmedEmailFromOrder(
      { from: mockFrom, schema: () => ({ from: mockSchemaFrom }) } as any,
      'order_123'
    )

    expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
  })
})
