import { describe, expect, it } from 'vitest'

import { type ProductWithPrice, calculateCashPrice, formatProductPrice } from './use-product-price'

describe('calculateCashPrice', () => {
  it('aplica desconto percentual corretamente (valor em centavos)', () => {
    expect(calculateCashPrice(10000, 0)).toBe(10000)
    expect(calculateCashPrice(10000, 10)).toBe(9000)
    expect(calculateCashPrice(10000, 100)).toBe(0)
  })

  it('arredonda para inteiro', () => {
    expect(calculateCashPrice(9999, 10)).toBe(8999)
    expect(calculateCashPrice(3333, 33)).toBe(2233)
  })

  it('desconto 0% retorna valor original', () => {
    expect(calculateCashPrice(19700, 0)).toBe(19700)
  })

  it('desconto 15% em R$ 99,90 (9990 centavos)', () => {
    expect(calculateCashPrice(9990, 15)).toBe(8492)
  })
})

describe('formatProductPrice', () => {
  const baseProduct = (prices: ProductWithPrice['prices']): ProductWithPrice => ({
    id: 'prod-1',
    name: 'Produto',
    ref: 'produto-ref',
    description: null,
    active: true,
    payment_methods: null,
    refund_policy: null,
    email_config: null,
    webhook_url: null,
    webhook_secret: null,
    metadata: null,
    created_at: null,
    updated_at: null,
    prices,
  })

  it('sem preço principal retorna R$ 0,00 e tags vazias', () => {
    const product = baseProduct([])
    const result = formatProductPrice(product)
    expect(result.formattedPrice).toBe('R$ 0,00')
    expect(result.formattedCashTag).toBe('')
    expect(result.formattedInstallmentsTag).toBe('')
  })

  it('com cash_discount em metadata formata preço à vista com desconto', () => {
    const product = baseProduct([
      {
        id: 'price-1',
        ref: 'ref-1',
        product_id: 'prod-1',
        amount: 10000,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        active: true,
        metadata: { cash_discount: 10, max_installments: 12 },
        email_addon: null,
        created_at: null,
        updated_at: null,
      },
    ])
    const result = formatProductPrice(product)
    expect(result.formattedPrice).toMatch(/R\$\s*90,00/)
    expect(result.formattedCashTag).toContain('90,00')
    expect(result.formattedCashTag).toContain('10% de desconto')
  })

  it('sem cash_discount em metadata usa 0% e não exibe "de desconto"', () => {
    const product = baseProduct([
      {
        id: 'price-1',
        ref: 'ref-1',
        product_id: 'prod-1',
        amount: 10000,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        active: true,
        metadata: null,
        email_addon: null,
        created_at: null,
        updated_at: null,
      },
    ])
    const result = formatProductPrice(product)
    expect(result.formattedPrice).toMatch(/R\$\s*100,00/)
    expect(result.formattedCashTag).toMatch(/R\$\s*100,00 à vista/)
    expect(result.formattedCashTag).not.toContain('desconto')
  })

  it('com max_installments em metadata formata parcelamento', () => {
    const product = baseProduct([
      {
        id: 'price-1',
        ref: 'ref-1',
        product_id: 'prod-1',
        amount: 12000,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        active: true,
        metadata: { cash_discount: 0, max_installments: 12 },
        email_addon: null,
        created_at: null,
        updated_at: null,
      },
    ])
    const result = formatProductPrice(product)
    expect(result.formattedInstallmentsTag).toMatch(/12x de R\$\s*10,00/)
    expect(result.formattedInstallmentsTag).not.toMatch(/total:/i)
  })

  it('max_installments 1 não exibe tag de parcelamento', () => {
    const product = baseProduct([
      {
        id: 'price-1',
        ref: 'ref-1',
        product_id: 'prod-1',
        amount: 10000,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        active: true,
        metadata: { cash_discount: 0, max_installments: 1 },
        email_addon: null,
        created_at: null,
        updated_at: null,
      },
    ])
    const result = formatProductPrice(product)
    expect(result.formattedInstallmentsTag).toBe('')
  })

  it('metadata com tipos inválidos usa 0 e 1 como fallback', () => {
    const product = baseProduct([
      {
        id: 'price-1',
        ref: 'ref-1',
        product_id: 'prod-1',
        amount: 10000,
        currency: 'BRL',
        recurring: false,
        interval: null,
        interval_count: null,
        active: true,
        metadata: { cash_discount: true, max_installments: {} } as unknown as Parameters<
          typeof formatProductPrice
        >[0]['prices'][0]['metadata'],
        email_addon: null,
        created_at: null,
        updated_at: null,
      },
    ])
    const result = formatProductPrice(product)
    expect(result.formattedPrice).toMatch(/R\$\s*100,00/)
    expect(result.formattedInstallmentsTag).toBe('')
  })
})
