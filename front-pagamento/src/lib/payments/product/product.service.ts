import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { getLogger } from '@/lib/logger'

import type { ProductRepository } from './product.repository.interface'
import type {
  CreatePriceDTO,
  CreateProductDTO,
  Product,
  UpdatePriceDTO,
  UpdateProductDTO,
} from './product.types'

/**
 * Service para gerenciar produtos
 * Contém lógica de negócio relacionada a produtos
 */
export class ProductService {
  private logger = getLogger()

  constructor(private productRepository: ProductRepository) {}

  /**
   * Busca um produto por ID
   * @throws {NotFoundError} Se produto não encontrado
   */
  async getProductById(id: string): Promise<Product> {
    if (!id) {
      throw new ValidationError('ID do produto é obrigatório', 'id')
    }

    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundError('Produto', id)
    }

    return product
  }

  /**
   * Busca um produto por ref
   * @throws {NotFoundError} Se produto não encontrado
   */
  async getProductByRef(ref: string): Promise<Product> {
    if (!ref) {
      throw new ValidationError('Ref do produto é obrigatório', 'ref')
    }

    const product = await this.productRepository.findByRef(ref)

    if (!product) {
      throw new NotFoundError('Produto', ref)
    }

    return product
  }

  /**
   * Lista todos os produtos
   */
  async getAllProducts(options?: { active?: boolean }): Promise<Product[]> {
    this.logger.info('Buscando produtos', { options })

    try {
      const products = await this.productRepository.findAll(options)

      this.logger.info('Produtos buscados com sucesso', {
        count: products.length,
      })

      return products
    } catch (error) {
      this.logger.error('Erro ao buscar produtos', error, { options })
      throw error
    }
  }

  /**
   * Lista produtos por refs (uma ida ao banco)
   */
  async getProductsByRefs(refs: string[], options?: { active?: boolean }): Promise<Product[]> {
    if (!refs.length) {
      return []
    }
    return this.productRepository.findByRefs(refs, options)
  }

  /**
   * Gera prefixo alfanumérico curto (ex.: a1b2c3) para ref única
   */
  private static randomRefPrefix(length = 6): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)]
    }
    return out
  }

  private static sanitizeProductLogData<T extends { webhook_secret?: string | null }>(
    data: T
  ): Omit<T, 'webhook_secret'> & { has_webhook_secret?: boolean } {
    const { webhook_secret, ...rest } = data
    return {
      ...rest,
      ...(webhook_secret !== undefined ? { has_webhook_secret: Boolean(webhook_secret) } : {}),
    }
  }

  /**
   * Cria um novo produto
   * @throws {ValidationError} Se dados inválidos
   * @throws {ConflictError} Se ref já existe mesmo com prefixo aleatório
   */
  async createProduct(data: CreateProductDTO, userId: string): Promise<Product> {
    this.logger.info('Criando produto', {
      data: ProductService.sanitizeProductLogData(data),
      userId,
    })

    // Validações de negócio
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Nome do produto é obrigatório', 'name')
    }

    if (data.name.length > 255) {
      throw new ValidationError('Nome do produto deve ter no máximo 255 caracteres', 'name')
    }

    if (!data.ref || data.ref.trim().length === 0) {
      throw new ValidationError('Ref do produto é obrigatório', 'ref')
    }

    if (data.ref.length > 100) {
      throw new ValidationError('Ref do produto deve ter no máximo 100 caracteres', 'ref')
    }

    let refToUse = data.ref.trim()
    const existing = await this.productRepository.findByRef(refToUse)
    if (existing) {
      const prefix = ProductService.randomRefPrefix(6)
      refToUse = `${prefix}-${refToUse}`.slice(0, 100)
      const existingAgain = await this.productRepository.findByRef(refToUse)
      if (existingAgain) {
        throw new ConflictError('Produto com este ref já existe')
      }
      this.logger.info('Ref em conflito; usando ref com prefixo', {
        originalRef: data.ref,
        newRef: refToUse,
      })
      data = { ...data, ref: refToUse }
    }

    try {
      const product = await this.productRepository.create(data)

      this.logger.info('Produto criado com sucesso', {
        productId: product.id,
        userId,
      })

      return product
    } catch (error) {
      this.logger.error('Erro ao criar produto', error, {
        data: ProductService.sanitizeProductLogData(data),
        userId,
      })
      throw error
    }
  }

  /**
   * Cria produto e preços em uma única operação
   */
  async createProductWithPrices(
    data: CreateProductDTO,
    prices: CreatePriceDTO[],
    userId: string
  ): Promise<Product> {
    const product = await this.createProduct(data, userId)
    if (prices.length > 0) {
      await this.productRepository.createPrices(product.id, product.ref, prices)
      return (await this.productRepository.findById(product.id))!
    }
    return product
  }

  /**
   * Atualiza um produto existente
   * @throws {NotFoundError} Se produto não encontrado
   * @throws {ValidationError} Se dados inválidos
   */
  async updateProduct(id: string, data: UpdateProductDTO, userId: string): Promise<Product> {
    this.logger.info('Atualizando produto', {
      id,
      data: ProductService.sanitizeProductLogData(data),
      userId,
    })

    // Verificar se existe
    const existing = await this.productRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Produto', id)
    }

    // Validações de negócio
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError('Nome do produto não pode ser vazio', 'name')
      }

      if (data.name.length > 255) {
        throw new ValidationError('Nome do produto deve ter no máximo 255 caracteres', 'name')
      }
    }

    if (data.ref !== undefined) {
      if (data.ref.trim().length === 0) {
        throw new ValidationError('Ref do produto não pode ser vazio', 'ref')
      }

      if (data.ref.length > 100) {
        throw new ValidationError('Ref do produto deve ter no máximo 100 caracteres', 'ref')
      }

      // Verificar conflito de ref (se mudou)
      if (data.ref !== existing.ref) {
        const existingByRef = await this.productRepository.findByRef(data.ref)
        if (existingByRef) {
          throw new ConflictError('Produto com este ref já existe')
        }
      }
    }

    try {
      const product = await this.productRepository.update(id, data)

      if (data.prices && data.prices.length > 0) {
        await this.productRepository.updatePrices(id, data.prices)
        this.logger.info('Produto e preços atualizados com sucesso', {
          productId: product.id,
          userId,
        })
        return (await this.productRepository.findById(id))!
      }

      this.logger.info('Produto atualizado com sucesso', {
        productId: product.id,
        userId,
      })

      return product
    } catch (error) {
      this.logger.error('Erro ao atualizar produto', error, {
        id,
        data: ProductService.sanitizeProductLogData(data),
        userId,
      })
      throw error
    }
  }

  /**
   * Deleta um produto
   * @throws {NotFoundError} Se produto não encontrado
   */
  async deleteProduct(id: string, userId: string): Promise<void> {
    this.logger.info('Deletando produto', { id, userId })

    // Verificar se existe
    const existing = await this.productRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Produto', id)
    }

    try {
      await this.productRepository.delete(id)

      this.logger.info('Produto deletado com sucesso', { id, userId })
    } catch (error) {
      this.logger.error('Erro ao deletar produto', error, { id, userId })
      throw error
    }
  }

  /**
   * Cria um preço para um produto existente
   * @throws {NotFoundError} Se produto não encontrado
   */
  async createPrice(productId: string, data: CreatePriceDTO, userId: string): Promise<Product> {
    this.logger.info('Criando preço', { productId, data, userId })

    const product = await this.productRepository.findById(productId)
    if (!product) {
      throw new NotFoundError('Produto', productId)
    }

    try {
      await this.productRepository.createPrices(productId, product.ref, [data])
      this.logger.info('Preço criado com sucesso', { productId, userId })
      return (await this.productRepository.findById(productId))!
    } catch (error) {
      this.logger.error('Erro ao criar preço', error, { productId, data, userId })
      throw error
    }
  }

  /**
   * Atualiza um preço existente
   * @throws {NotFoundError} Se produto ou preço não encontrado
   */
  async updatePrice(
    productId: string,
    priceId: string,
    data: Omit<UpdatePriceDTO, 'id'>,
    userId: string
  ): Promise<Product> {
    this.logger.info('Atualizando preço', { productId, priceId, data, userId })

    const product = await this.productRepository.findById(productId)
    if (!product) {
      throw new NotFoundError('Produto', productId)
    }

    const belongsToProduct = product.prices?.some((p) => p.id === priceId)
    if (!belongsToProduct) {
      throw new NotFoundError('Preço', priceId)
    }

    try {
      await this.productRepository.updatePrices(productId, [{ ...data, id: priceId }])
      this.logger.info('Preço atualizado com sucesso', { priceId, productId, userId })
      return (await this.productRepository.findById(productId))!
    } catch (error) {
      this.logger.error('Erro ao atualizar preço', error, { productId, priceId, data, userId })
      throw error
    }
  }

  /**
   * Deleta um preço de um produto
   * @throws {NotFoundError} Se produto ou preço não encontrado / preço não pertence ao produto
   */
  async deletePrice(productId: string, priceId: string, userId: string): Promise<void> {
    this.logger.info('Deletando preço', { productId, priceId, userId })

    const product = await this.productRepository.findById(productId)
    if (!product) {
      throw new NotFoundError('Produto', productId)
    }

    const belongsToProduct = product.prices?.some((p) => p.id === priceId)
    if (!belongsToProduct) {
      throw new NotFoundError('Preço', priceId)
    }

    try {
      await this.productRepository.deletePrice(priceId)
      this.logger.info('Preço deletado com sucesso', { priceId, productId, userId })
    } catch (error) {
      this.logger.error('Erro ao deletar preço', error, { productId, priceId, userId })
      throw error
    }
  }
}
