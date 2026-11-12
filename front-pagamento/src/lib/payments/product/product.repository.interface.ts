import type {
  CreatePriceDTO,
  CreateProductDTO,
  Product,
  UpdatePriceDTO,
  UpdateProductDTO,
} from './product.types'

/**
 * Interface do repositório de produtos
 */
export interface ProductRepository {
  /**
   * Busca um produto por ID
   */
  findById(id: string): Promise<Product | null>

  /**
   * Busca um produto por ref
   */
  findByRef(ref: string): Promise<Product | null>

  /**
   * Busca todos os produtos
   */
  findAll(options?: { active?: boolean }): Promise<Product[]>

  /**
   * Busca produtos por refs (uma query; respeita RLS do cliente)
   */
  findByRefs(refs: string[], options?: { active?: boolean }): Promise<Product[]>

  /**
   * Cria um novo produto
   */
  create(data: CreateProductDTO): Promise<Product>

  /**
   * Cria preços para um produto.
   * O ref de cada preço será prefixado com productRef para garantir unicidade.
   */
  createPrices(productId: string, productRef: string, prices: CreatePriceDTO[]): Promise<void>

  /**
   * Atualiza um produto existente
   */
  update(id: string, data: UpdateProductDTO): Promise<Product>

  /**
   * Atualiza preços existentes de um produto (por id de cada price).
   */
  updatePrices(productId: string, prices: UpdatePriceDTO[]): Promise<void>

  /**
   * Deleta um produto
   */
  delete(id: string): Promise<void>

  /**
   * Deleta um preço pelo ID
   */
  deletePrice(priceId: string): Promise<void>

  /**
   * Verifica se um produto existe
   */
  exists(id: string): Promise<boolean>
}
