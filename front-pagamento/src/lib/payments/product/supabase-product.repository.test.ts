import { describe, expect, it, vi } from 'vitest'

import type { AppSupabaseClient } from '@/lib/payments/types/supabase-client'

import type { CreatePriceDTO, UpdatePriceDTO } from './product.types'
import { SupabaseProductRepository } from './supabase-product.repository'

function createMockSupabaseForInsert() {
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({
      data: [
        { id: 'price-id-1', ref: 'pref-preco-1' },
        { id: 'price-id-2', ref: 'pref-p1' },
      ],
      error: null,
    }),
  })
  const from = vi.fn().mockReturnValue({ insert })
  const schema = vi.fn().mockReturnValue({ from })
  return { schema, from, insert } as unknown as AppSupabaseClient & { insert: typeof insert }
}

function createMockSupabaseForUpdate() {
  const eq2 = vi.fn().mockResolvedValue({ error: null })
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
  const update = vi.fn().mockReturnValue({ eq: eq1 })

  const listEq = vi.fn().mockResolvedValue({
    data: [{ id: 'price-uuid-1' }],
    error: null,
  })
  const select = vi.fn().mockReturnValue({ eq: listEq })

  const deleteIn = vi.fn().mockResolvedValue({ error: null })
  const deleteFn = vi.fn().mockReturnValue({ in: deleteIn })

  const from = vi.fn((table: string) => {
    if (table === 'prices') {
      return { update, select }
    }
    if (table === 'price_upgrade_paths' || table === 'price_addon_offers') {
      return { delete: deleteFn }
    }
    return { update, select }
  })

  const schema = vi.fn().mockReturnValue({ from })
  return {
    schema,
    from,
    update,
    eq1,
    eq2,
    select,
    listEq,
    deleteFn,
    deleteIn,
  } as unknown as AppSupabaseClient & {
    update: ReturnType<typeof vi.fn>
    eq1: ReturnType<typeof vi.fn>
    eq2: ReturnType<typeof vi.fn>
  }
}

describe('SupabaseProductRepository', () => {
  describe('createPrices', () => {
    it('persiste metadata em cada preço', async () => {
      const mockSupabase = createMockSupabaseForInsert()
      const repo = new SupabaseProductRepository(mockSupabase)
      const productId = 'prod-123'
      const productRef = 'prod-ref'
      const prices: CreatePriceDTO[] = [
        {
          ref: 'preco-1',
          amount: 9990,
          currency: 'BRL',
          metadata: { cash_discount: 10, max_installments: 12 },
        },
      ]

      await repo.createPrices(productId, productRef, prices)

      expect(mockSupabase.schema).toHaveBeenCalledWith('payments')
      expect(mockSupabase.from).toHaveBeenCalledWith('prices')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            product_id: productId,
            amount: 9990,
            currency: 'BRL',
            metadata: { cash_discount: 10, max_installments: 12 },
            email_addon: {},
          }),
        ])
      )
    })

    it('usa metadata vazio quando não informado', async () => {
      const mockSupabase = createMockSupabaseForInsert()
      const repo = new SupabaseProductRepository(mockSupabase as unknown as AppSupabaseClient)
      const prices: CreatePriceDTO[] = [{ ref: 'p1', amount: 5000 }]

      await repo.createPrices('pid', 'pref', prices)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            metadata: {},
            email_addon: {},
          }),
        ])
      )
    })
  })

  describe('updatePrices', () => {
    it('atualiza amount e metadata por id para cada price', async () => {
      const mockSupabase = createMockSupabaseForUpdate()
      const repo = new SupabaseProductRepository(mockSupabase)
      const productId = 'prod-1'
      const prices: UpdatePriceDTO[] = [
        {
          id: 'price-uuid-1',
          amount: 8990,
          metadata: { cash_discount: 15, max_installments: 6 },
        },
      ]

      await repo.updatePrices(productId, prices)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 8990,
          metadata: { cash_discount: 15, max_installments: 6 },
        })
      )
      expect(mockSupabase.eq1).toHaveBeenCalledWith('id', 'price-uuid-1')
      expect(mockSupabase.eq2).toHaveBeenCalledWith('product_id', productId)
    })

    it('não faz chamada quando prices é array vazio', async () => {
      const mockSupabase = createMockSupabaseForInsert()
      const repo = new SupabaseProductRepository(mockSupabase)

      await repo.updatePrices('prod-1', [])

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
})
