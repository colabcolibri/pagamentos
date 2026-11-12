import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NotFoundError } from '@/lib/errors'

import type { ProductRepository } from './product.repository.interface'
import { ProductService } from './product.service'
import type { Product, UpdatePriceDTO, UpdateProductDTO } from './product.types'

describe('ProductService', () => {
  let mockRepo: ProductRepository

  const productId = '550e8400-e29b-41d4-a716-446655440000'
  const existingProduct: Product = {
    id: productId,
    name: 'Produto',
    ref: 'prod-ref',
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
    prices: [
      {
        id: 'price-id-1',
        ref: 'prod-ref-1',
        product_id: productId,
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
    ],
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByRef: vi.fn(),
      findAll: vi.fn(),
      findByRefs: vi.fn(),
      create: vi.fn(),
      createPrices: vi.fn(),
      update: vi.fn(),
      updatePrices: vi.fn(),
      delete: vi.fn(),
      deletePrice: vi.fn(),
      exists: vi.fn(),
    }
  })

  describe('updateProduct', () => {
    it('quando data.prices existe, chama updatePrices e retorna produto atualizado', async () => {
      const updatedProduct: Product = {
        ...existingProduct,
        prices: [
          {
            ...existingProduct.prices![0],
            amount: 8990,
            metadata: { cash_discount: 10, max_installments: 12 },
          },
        ],
      }

      vi.mocked(mockRepo.findById).mockResolvedValue(existingProduct)
      vi.mocked(mockRepo.update).mockResolvedValue(existingProduct)
      vi.mocked(mockRepo.updatePrices).mockResolvedValue()
      vi.mocked(mockRepo.findById)
        .mockResolvedValueOnce(existingProduct)
        .mockResolvedValueOnce(updatedProduct)

      const service = new ProductService(mockRepo)
      const data: UpdateProductDTO = {
        prices: [
          {
            id: 'price-id-1',
            amount: 8990,
            metadata: { cash_discount: 10, max_installments: 12 },
          } as UpdatePriceDTO,
        ],
      }

      const result = await service.updateProduct(productId, data, 'user-1')

      expect(mockRepo.update).toHaveBeenCalledWith(
        productId,
        expect.objectContaining({ prices: data.prices })
      )
      expect(mockRepo.updatePrices).toHaveBeenCalledWith(productId, data.prices)
      expect(mockRepo.findById).toHaveBeenCalledWith(productId)
      expect(result).toEqual(updatedProduct)
    })

    it('quando data.prices não existe, não chama updatePrices', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(existingProduct)
      vi.mocked(mockRepo.update).mockResolvedValue({ ...existingProduct, name: 'Novo Nome' })

      const service = new ProductService(mockRepo)
      const data: UpdateProductDTO = { name: 'Novo Nome' }

      await service.updateProduct(productId, data, 'user-1')

      expect(mockRepo.updatePrices).not.toHaveBeenCalled()
    })

    it('quando data.prices é array vazio, não chama updatePrices', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(existingProduct)
      vi.mocked(mockRepo.update).mockResolvedValue(existingProduct)

      const service = new ProductService(mockRepo)
      await service.updateProduct(productId, { prices: [] }, 'user-1')

      expect(mockRepo.updatePrices).not.toHaveBeenCalled()
    })

    it('lança NotFoundError se produto não existe', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null)

      const service = new ProductService(mockRepo)

      await expect(service.updateProduct(productId, { name: 'X' }, 'user-1')).rejects.toThrow(
        NotFoundError
      )

      expect(mockRepo.update).not.toHaveBeenCalled()
      expect(mockRepo.updatePrices).not.toHaveBeenCalled()
    })
  })
})
