import type { SupabaseClient } from '../../types/query-client'

import type {
    CreateOrderDTO, Database, DbOrder,
    DbOrderInsert,
    DbOrderUpdate,
    Order,
    OrderQueryOptions,
    OrderStatus,
    UpdateOrderDTO
} from '../types'
import type { OrderRepository } from './order.repository.interface'

/**
 * Implementação Supabase do repositório de pedidos
 */
export class SupabaseOrderRepository implements OrderRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string, options?: { includeRelations?: boolean }): Promise<Order | null> {
    const query = this.supabase
      .schema('payments')
      .from('orders')
      .select(this.getSelectQuery(options?.includeRelations))
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return this.mapToOrder(data as unknown as DbOrder)
  }

  async findMany(options?: OrderQueryOptions): Promise<Order[]> {
    // Sempre usar a tabela 'orders' e fazer select com relações se necessário
    const selectQuery = options?.includeRelations ? this.getSelectQuery(true) : '*'

    let query = this.supabase.schema('payments').from('orders').select(selectQuery)

    // Filtrar pedidos não deletados (soft delete)
    query = query.is('deleted_at', null)

    // Aplicar filtros
    query = this.applyFilters(query, options)

    // Aplicar ordenação
    const orderBy = options?.orderBy || 'created_at'
    const orderDirection = options?.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Aplicar paginação
    if (options?.limit) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map((item: any) => this.mapToOrder(item as unknown as DbOrder))
  }

  async count(options?: OrderQueryOptions): Promise<number> {
    let query = this.supabase
      .schema('payments')
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    // Aplicar filtros (sem relações para count)
    query = this.applyFilters(query, { ...options, includeRelations: false })

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  async create(data: CreateOrderDTO): Promise<Order> {
    const insertData: DbOrderInsert = {
      user_id: data.user_id,
      product_id: data.product_id,
      price_id: data.price_id,
      subscription_id: data.subscription_id || null,
      order_type: data.order_type,
      amount_cents: data.amount_cents,
      payment_gateway: data.payment_gateway,
      payment_method: data.payment_method || null,
      expires_at: data.expires_at || null,
      metadata: data.metadata || null,
      status: 'pending',
    }

    const { data: order, error } = await this.supabase
      .schema('payments')
      .from('orders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!order) {
      throw new Error('Pedido não foi criado')
    }

    return this.mapToOrder(order as unknown as DbOrder)
  }

  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    const updateData: DbOrderUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: order, error } = await this.supabase
      .schema('payments')
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!order) {
      throw new Error('Pedido não foi atualizado')
    }

    return this.mapToOrder(order as unknown as DbOrder)
  }

  async delete(id: string): Promise<void> {
    // Soft delete: marcar deleted_at ao invés de deletar fisicamente
    const { error } = await this.supabase
      .schema('payments')
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null) // Só atualiza se ainda não foi deletado

    if (error) {
      throw error
    }
  }

  async exists(id: string): Promise<boolean> {
    const order = await this.findById(id)
    return order !== null
  }

  /**
   * Retorna a query de select com ou sem relações
   */
  private getSelectQuery(includeRelations?: boolean): string {
    if (includeRelations) {
      return `
        *,
        products!orders_product_id_fkey (
          id,
          name,
          ref,
          description
        ),
        prices!orders_price_id_fkey (
          id,
          amount,
          currency,
          recurring,
          interval,
          interval_count
        )
      `
    }
    return '*'
  }

  /**
   * Aplica filtros na query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, options?: OrderQueryOptions): any {
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    if (options?.orderType) {
      query = query.eq('order_type', options.orderType)
    }

    if (options?.paymentGateway) {
      query = query.eq('payment_gateway', options.paymentGateway)
    }

    if (options?.paymentMethod) {
      query = query.eq('payment_method', options.paymentMethod)
    }

    return query
  }

  /**
   * Mapeia dados do banco para o tipo Order
   */
  private mapToOrder(data: DbOrder): Order {
    return {
      id: data.id,
      user_id: data.user_id,
      product_id: data.product_id,
      price_id: data.price_id,
      subscription_id: data.subscription_id,
      order_type: data.order_type as Order['order_type'],
      status: data.status as OrderStatus,
      amount_cents: data.amount_cents,
      payment_method: data.payment_method,
      payment_gateway: data.payment_gateway as Order['payment_gateway'],
      paid_at: data.paid_at,
      cancelled_at: data.cancelled_at,
      refunded_at: data.refunded_at,
      expires_at: data.expires_at,
      deleted_at: data.deleted_at,
      metadata: data.metadata,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }
}

