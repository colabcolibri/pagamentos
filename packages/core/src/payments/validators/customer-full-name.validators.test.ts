import { describe, expect, it } from 'vitest'

import { asaasCheckoutAvistaBodySchema } from './asaas-checkout-avista.validators'
import { nameHasAtLeastTwoParts } from './customer-full-name.validators'

const validPriceId = '550e8400-e29b-41d4-a716-446655440000'

describe('nameHasAtLeastTwoParts', () => {
  it('aceita duas ou mais palavras', () => {
    expect(nameHasAtLeastTwoParts('João Silva')).toBe(true)
    expect(nameHasAtLeastTwoParts('  Maria  Souza  Costa ')).toBe(true)
  })

  it('rejeita uma única palavra', () => {
    expect(nameHasAtLeastTwoParts('Madonna')).toBe(false)
    expect(nameHasAtLeastTwoParts('  X  ')).toBe(false)
  })
})

describe('asaasCheckoutAvistaBodySchema — nome completo', () => {
  const base = {
    price_id: validPriceId,
    customer_info: {
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11987654321',
    },
  }

  it('rejeita PF com nome de uma palavra', () => {
    const result = asaasCheckoutAvistaBodySchema.safeParse({
      ...base,
      customer_info: { ...base.customer_info, name: 'João' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'customer_info.name')).toBe(true)
    }
  })

  it('rejeita PJ com razão social de uma palavra', () => {
    const result = asaasCheckoutAvistaBodySchema.safeParse({
      ...base,
      customer_info: {
        ...base.customer_info,
        name: 'João Silva',
        person_type: 'juridica' as const,
        razao_social: 'Empresa',
        cnpj: '12.345.678/0001-90',
      },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join('.') === 'customer_info.razao_social')
      ).toBe(true)
    }
  })
})
