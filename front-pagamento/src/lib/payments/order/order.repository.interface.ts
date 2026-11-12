import type { CreateOrderDTO, Order, OrderQueryOptions, UpdateOrderDTO } from './order.types'

/**
 * Interface do repositório de pedidos
 */
export interface OrderRepository {
  /**
   * Busca um pedido por ID
   */
  findById(id: string, options?: { includeRelations?: boolean }): Promise<Order | null>

  /**
   * Busca pedidos com filtros
   */
  findMany(options?: OrderQueryOptions): Promise<Order[]>

  /**
   * Conta pedidos com filtros
   */
  count(options?: OrderQueryOptions): Promise<number>

  /**
   * Cria um novo pedido
   */
  create(data: CreateOrderDTO): Promise<Order>

  /**
   * Atualiza um pedido existente
   */
  update(id: string, data: UpdateOrderDTO): Promise<Order>

  /**
   * Deleta um pedido (soft delete se suportado)
   */
  delete(id: string): Promise<void>

  /**
   * Verifica se um pedido existe
   */
  exists(id: string): Promise<boolean>
}
