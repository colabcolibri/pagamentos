import { describe, expect, it } from 'vitest'

import type { GeneratedProduct } from './product-generation-prompt'
import { buildProductGenerationPrompt } from './product-generation-prompt'

describe('GeneratedProduct (schema / tipo)', () => {
  it('prices podem ter metadata com cash_discount e max_installments', () => {
    const example: GeneratedProduct = {
      product: {
        name: 'Curso',
        ref: 'curso-ref',
        description: null,
        active: true,
        payment_methods: ['credit_card', 'pix'],
        refund_policy: null,
      },
      prices: [
        {
          ref: 'unico',
          amount: 9990,
          currency: 'BRL',
          recurring: false,
          interval: null,
          interval_count: null,
          active: true,
          metadata: {
            cash_discount: 10,
            max_installments: 12,
          },
        },
      ],
    }
    expect(example.prices[0].metadata?.cash_discount).toBe(10)
    expect(example.prices[0].metadata?.max_installments).toBe(12)
  })

  it('metadata em price é opcional', () => {
    const example: GeneratedProduct = {
      product: {
        name: 'X',
        ref: 'x',
        description: null,
        active: true,
        payment_methods: [],
        refund_policy: null,
      },
      prices: [
        {
          ref: 'p1',
          amount: 5000,
          currency: 'BRL',
          recurring: false,
          interval: null,
          interval_count: null,
          active: true,
        },
      ],
    }
    expect(example.prices[0].metadata).toBeUndefined()
  })

  it('product pode ter email_config com order_created e payment_confirmed', () => {
    const example: GeneratedProduct = {
      product: {
        name: 'Curso',
        ref: 'curso',
        description: null,
        active: true,
        payment_methods: ['pix', 'boleto'],
        refund_policy: null,
        email_config: {
          order_created: {
            from_name: 'Empresa',
            from_email: 'naoresponda@empresa.com',
            subject: 'Pedido criado!',
            include_next_steps: false,
            next_steps: [],
          },
          payment_confirmed: {
            from_name: 'Empresa',
            from_email: 'naoresponda@empresa.com',
            subject: 'Pagamento confirmado!',
            include_next_steps: true,
            next_steps: ['Acesse sua conta'],
          },
        },
      },
      prices: [
        {
          ref: 'p1',
          amount: 9900,
          currency: 'BRL',
          recurring: false,
          interval: null,
          interval_count: null,
          active: true,
        },
      ],
    }
    expect(example.product.email_config?.order_created?.subject).toBe('Pedido criado!')
    expect(example.product.email_config?.payment_confirmed?.next_steps).toEqual([
      'Acesse sua conta',
    ])
  })
})

describe('buildProductGenerationPrompt', () => {
  it('contém instruções de cash_discount no texto do prompt', () => {
    const prompt = buildProductGenerationPrompt({
      name: 'Test',
      description: 'Desc',
      priceInfo: 'R$ 99',
      priceType: 'one_time',
      objective: 'Venda',
      policyInfo: '7 dias',
    })
    expect(prompt).toContain('cash_discount')
    expect(prompt).toContain('desconto à vista')
    expect(prompt).toMatch(/0-100|percentual|%/)
  })

  it('contém instruções de max_installments no texto do prompt', () => {
    const prompt = buildProductGenerationPrompt({
      name: 'Test',
      description: 'Desc',
      priceInfo: 'R$ 99',
      priceType: 'one_time',
      objective: 'Venda',
      policyInfo: '7 dias',
    })
    expect(prompt).toContain('max_installments')
    expect(prompt).toContain('parcelas')
    expect(prompt).toMatch(/1-24|parcelado/)
  })

  it('inclui seção Preços com desconto à vista e parcelamento', () => {
    const prompt = buildProductGenerationPrompt({
      name: 'Test',
      description: 'Desc',
      priceInfo: 'R$ 99',
      priceType: 'one_time',
      objective: 'Venda',
      policyInfo: '7 dias',
    })
    expect(prompt).toContain('Preços:')
    expect(prompt).toContain('desconto à vista')
    expect(prompt).toContain('parcelamento')
  })

  it('checklist mental menciona cash_discount e max_installments', () => {
    const prompt = buildProductGenerationPrompt({
      name: 'Test',
      description: 'Desc',
      priceInfo: 'R$ 99',
      priceType: 'one_time',
      objective: 'Venda',
      policyInfo: '7 dias',
    })
    expect(prompt).toContain('cash_discount')
    expect(prompt).toContain('max_installments')
    expect(prompt).toContain('checklist')
  })

  it('inclui email_config e seção Email no prompt', () => {
    const prompt = buildProductGenerationPrompt({
      name: 'Test',
      description: 'Desc',
      priceInfo: 'R$ 99',
      priceType: 'one_time',
      objective: 'Venda',
      policyInfo: '7 dias',
    })
    expect(prompt).toContain('email_config')
    expect(prompt).toContain('order_created')
    expect(prompt).toContain('payment_confirmed')
    expect(prompt).toMatch(/Email.*email_config|email_config.*Email/)
    expect(prompt).toContain('from_name')
    expect(prompt).toContain('from_email')
    expect(prompt).toContain('subject')
  })
})
