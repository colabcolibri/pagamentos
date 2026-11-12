import { NotFoundError, ValidationError } from '@/lib/errors'
import { getLogger } from '@/lib/logger'

import type { OrderRepository } from './order.repository.interface'
import type {
  CreateOrderDTO,
  Order,
  OrderQueryOptions,
  OrderStatus,
  UpdateOrderDTO,
} from './order.types'

/**
 * Service para gerenciar pedidos
 * Contém lógica de negócio relacionada a pedidos
 */
export class OrderService {
  private logger = getLogger()

  constructor(private orderRepository: OrderRepository) {}

  /**
   * Busca um pedido por ID
   * @throws {NotFoundError} Se pedido não encontrado
   */
  async getOrderById(id: string, options?: { includeRelations?: boolean }): Promise<Order> {
    if (!id) {
      throw new ValidationError('ID do pedido é obrigatório', 'id')
    }

    const order = await this.orderRepository.findById(id, options)

    if (!order) {
      throw new NotFoundError('Pedido', id)
    }

    return order
  }

  /**
   * Lista pedidos com filtros
   */
  async getOrders(options?: OrderQueryOptions): Promise<Order[]> {
    this.logger.info('Buscando pedidos', { options })

    try {
      const orders = await this.orderRepository.findMany(options)

      this.logger.info('Pedidos buscados com sucesso', {
        count: orders.length,
      })

      return orders
    } catch (error) {
      this.logger.error('Erro ao buscar pedidos', error, { options })
      throw error
    }
  }

  /**
   * Conta pedidos com filtros
   */
  async countOrders(options?: OrderQueryOptions): Promise<number> {
    try {
      return await this.orderRepository.count(options)
    } catch (error) {
      this.logger.error('Erro ao contar pedidos', error, { options })
      throw error
    }
  }

  /**
   * Cria um novo pedido
   * @throws {ValidationError} Se dados inválidos
   */
  async createOrder(data: CreateOrderDTO, userId: string): Promise<Order> {
    this.logger.info('Criando pedido', { data, userId })

    // Validações de negócio
    if (!data.user_id) {
      throw new ValidationError('ID do usuário é obrigatório', 'user_id')
    }

    if (!data.product_id) {
      throw new ValidationError('ID do produto é obrigatório', 'product_id')
    }

    if (!data.price_id) {
      throw new ValidationError('ID do preço é obrigatório', 'price_id')
    }

    if (!data.order_type || !['subscription', 'one_time'].includes(data.order_type)) {
      throw new ValidationError('Tipo de pedido inválido', 'order_type')
    }

    if (!data.payment_gateway || !['pagarme', 'asaas'].includes(data.payment_gateway)) {
      throw new ValidationError('Gateway de pagamento inválido', 'payment_gateway')
    }

    if (!data.amount_cents || data.amount_cents <= 0) {
      throw new ValidationError('Valor do pedido deve ser maior que zero', 'amount_cents')
    }

    try {
      const order = await this.orderRepository.create(data)

      this.logger.info('Pedido criado com sucesso', {
        orderId: order.id,
        userId,
      })

      return order
    } catch (error) {
      this.logger.error('Erro ao criar pedido', error, { data, userId })
      throw error
    }
  }

  /**
   * Atualiza um pedido existente
   * @throws {NotFoundError} Se pedido não encontrado
   * @throws {ValidationError} Se dados inválidos
   */
  async updateOrder(id: string, data: UpdateOrderDTO, userId: string): Promise<Order> {
    this.logger.info('Atualizando pedido', { id, data, userId })

    // Verificar se existe
    const existing = await this.orderRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Pedido', id)
    }

    // Validações de negócio
    if (data.status && !this.isValidStatus(data.status)) {
      throw new ValidationError('Status inválido', 'status')
    }

    try {
      const order = await this.orderRepository.update(id, data)

      this.logger.info('Pedido atualizado com sucesso', {
        orderId: order.id,
        userId,
      })

      return order
    } catch (error) {
      this.logger.error('Erro ao atualizar pedido', error, { id, data, userId })
      throw error
    }
  }

  /**
   * Atualiza status do pedido
   */
  async updateOrderStatus(id: string, status: OrderStatus, userId: string): Promise<Order> {
    const updateData: UpdateOrderDTO = {
      status,
      ...(status === 'paid' && { paid_at: new Date().toISOString() }),
      ...(status === 'cancelled' && { cancelled_at: new Date().toISOString() }),
      ...(status === 'refunded' && { refunded_at: new Date().toISOString() }),
    }

    return this.updateOrder(id, updateData, userId)
  }

  /**
   * Deleta um pedido
   * @throws {NotFoundError} Se pedido não encontrado
   */
  async deleteOrder(id: string, userId: string): Promise<void> {
    this.logger.info('Deletando pedido', { id, userId })

    // Verificar se existe
    const existing = await this.orderRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Pedido', id)
    }

    try {
      await this.orderRepository.delete(id)

      this.logger.info('Pedido deletado com sucesso', { id, userId })
    } catch (error) {
      this.logger.error('Erro ao deletar pedido', error, { id, userId })
      throw error
    }
  }

  /**
   * Verifica se um status é válido
   */
  private isValidStatus(status: string): status is OrderStatus {
    return ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'].includes(status)
  }
}
