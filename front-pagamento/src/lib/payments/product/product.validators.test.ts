import { describe, expect, it } from 'vitest'

import { productValidators } from './product.validators'

describe('productValidators.create (priceCreateSchema via prices)', () => {
  it('aceita price com metadata (cash_discount, max_installments)', () => {
    const data = {
      name: 'Produto',
      ref: 'prod-ref',
      prices: [
        {
          ref: 'preco-1',
          amount: 9990,
          currency: 'BRL',
          recurring: false,
          metadata: { cash_discount: 10, max_installments: 12 },
        },
      ],
    }
    const result = productValidators.create.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prices?.[0].metadata).toEqual({
        cash_discount: 10,
        max_installments: 12,
      })
    }
  })

  it('aceita price com metadata null', () => {
    const data = {
      name: 'Produto',
      ref: 'prod-ref',
      prices: [{ ref: 'preco-1', amount: 5000, metadata: null }],
    }
    const result = productValidators.create.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prices?.[0].metadata).toBeNull()
    }
  })

  it('aceita price sem metadata (opcional)', () => {
    const data = {
      name: 'Produto',
      ref: 'prod-ref',
      prices: [{ ref: 'preco-1', amount: 5000 }],
    }
    const result = productValidators.create.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejeita price sem ref', () => {
    const data = {
      name: 'Produto',
      ref: 'prod-ref',
      prices: [{ amount: 5000 }],
    }
    const result = productValidators.create.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejeita price com amount negativo', () => {
    const data = {
      name: 'Produto',
      ref: 'prod-ref',
      prices: [{ ref: 'preco-1', amount: -100 }],
    }
    const result = productValidators.create.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('productValidators.update (priceUpdateSchema e prices)', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000'

  it('aceita prices com id e metadata', () => {
    const data = {
      name: 'Nome atualizado',
      prices: [
        {
          id: validUuid,
          amount: 8990,
          metadata: { cash_discount: 15, max_installments: 6 },
        },
      ],
    }
    const result = productValidators.update.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prices).toHaveLength(1)
      expect(result.data.prices?.[0].id).toBe(validUuid)
      expect(result.data.prices?.[0].amount).toBe(8990)
      expect(result.data.prices?.[0].metadata).toEqual({
        cash_discount: 15,
        max_installments: 6,
      })
    }
  })

  it('aceita update só com prices (campos produto opcionais)', () => {
    const data = {
      prices: [{ id: validUuid, amount: 10000, metadata: { max_installments: 24 } }],
    }
    const result = productValidators.update.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prices?.[0].metadata).toEqual({ max_installments: 24 })
    }
  })

  it('rejeita price sem id no update', () => {
    const data = {
      prices: [{ amount: 10000, metadata: {} }],
    }
    const result = productValidators.update.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejeita price com id inválido (não UUID)', () => {
    const data = {
      prices: [{ id: 'not-a-uuid', amount: 10000 }],
    }
    const result = productValidators.update.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('aceita upgrade_to_price_ids e addon_price_ids (UUIDs)', () => {
    const other = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    const data = {
      prices: [
        {
          id: validUuid,
          upgrade_to_price_ids: [other],
          addon_price_ids: [other],
        },
      ],
    }
    const result = productValidators.update.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prices?.[0].upgrade_to_price_ids).toEqual([other])
      expect(result.data.prices?.[0].addon_price_ids).toEqual([other])
    }
  })
})
