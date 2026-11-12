import type { AppSupabaseClient } from '../types/supabase-client'
import type { OrderRepository } from './order.repository.interface'
import type {
  CreateOrderDTO,
  DbOrder,
  DbOrderInsert,
  DbOrderUpdate,
  Order,
  OrderQueryOptions,
  OrderStatus,
  UpdateOrderDTO,
} from './order.types'

/**
 * Implementação Supabase do repositório de pedidos
 */
export class SupabaseOrderRepository implements OrderRepository {
  constructor(private supabase: AppSupabaseClient) {}

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

    const order = this.mapToOrder(
      data as unknown as DbOrder & {
        products?: Array<{ id: string; name: string; ref: string; description: string | null }>
        prices?: Array<{
          id: string
          amount: number
          currency: string
          recurring: boolean
          interval: string | null
          interval_count: number | null
        }>
      }
    )

    const userId = (data as unknown as DbOrder).user_id
    if (options?.includeRelations && userId) {
      const { data: profile } = await this.supabase
        .schema('payments')
        .from('profiles')
        .select('id, email, name')
        .eq('id', userId)
        .single()
      if (profile) {
        order.profiles = { id: profile.id, email: profile.email, name: profile.name }
      }
    }

    return order
  }

  async findMany(options?: OrderQueryOptions): Promise<Order[]> {
    // Se includeRelations, usar view que já tem os dados relacionados
    const tableName = options?.includeRelations ? 'orders_with_relations' : 'orders'

    let query = this.supabase.schema('payments').from(tableName).select('*', { count: 'exact' })

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

    return (data || []).map((item: any) =>
      this.mapToOrder(
        item as unknown as DbOrder & {
          // Quando vem da view orders_with_relations
          product_id_rel?: string
          product_name?: string
          product_ref?: string
          product_description?: string | null
          price_id_rel?: string
          price_amount?: number
          price_currency?: string
          price_recurring?: boolean
          price_interval?: string | null
          price_interval_count?: number | null
          profile_id?: string
          profile_email?: string
          profile_name?: string | null
          // Quando vem do select direto com relações
          products?: Array<{ id: string; name: string; ref: string; description: string | null }>
          prices?: Array<{
            id: string
            amount: number
            currency: string
            recurring: boolean
            interval: string | null
            interval_count: number | null
          }>
        }
      )
    )
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
      .select(this.getSelectQuery(true))
      .single()

    if (error) {
      throw error
    }

    if (!order) {
      throw new Error('Pedido não foi criado')
    }

    return this.mapToOrder(
      order as unknown as DbOrder & {
        profiles?: Array<{ id: string; email: string; name: string | null }>
        products?: Array<{ id: string; name: string; ref: string }>
        prices?: Array<{
          id: string
          amount: number
          currency: string
          recurring: boolean
          interval: string | null
          interval_count: number | null
        }>
      }
    )
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
      .select(this.getSelectQuery(true))
      .single()

    if (error) {
      throw error
    }

    if (!order) {
      throw new Error('Pedido não foi atualizado')
    }

    return this.mapToOrder(
      order as unknown as DbOrder & {
        profiles?: Array<{ id: string; email: string; name: string | null }>
        products?: Array<{ id: string; name: string; ref: string }>
        prices?: Array<{
          id: string
          amount: number
          currency: string
          recurring: boolean
          interval: string | null
          interval_count: number | null
        }>
      }
    )
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
   * Nota: profiles não está incluído porque não há FK direta entre orders.user_id e payments.profiles.id
   * Se necessário, buscar profile separadamente usando orders.user_id = payments.profiles.id
   */
  private getSelectQuery(includeRelations?: boolean): string {
    if (includeRelations) {
      // Usar a sintaxe correta do Supabase para relações
      // products e prices são tabelas relacionadas via foreign keys
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
   * Usa unknown para evitar problemas de tipagem complexa do Supabase
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
  private mapToOrder(
    data: DbOrder & {
      // Pode vir como array (select direto) ou colunas simples (view)
      products?:
        | Array<{ id: string; name: string; ref: string; description?: string | null }>
        | { id: string; name: string; ref: string; description?: string | null }
        | null
      prices?:
        | Array<{
            id: string
            amount: number
            currency: string
            recurring: boolean
            interval: string | null
            interval_count: number | null
          }>
        | {
            id: string
            amount: number
            currency: string
            recurring: boolean
            interval: string | null
            interval_count: number | null
          }
        | null
      // Colunas da view orders_with_relations (quando vem da view)
      product_id_rel?: string
      product_name?: string
      product_ref?: string
      product_description?: string | null
      price_id_rel?: string
      price_amount?: number
      price_currency?: string
      price_recurring?: boolean
      price_interval?: string | null
      price_interval_count?: number | null
      profile_id?: string
      profile_email?: string
      profile_name?: string | null
    }
  ): Order {
    // Se vier da view (colunas simples), construir objetos products e prices
    const productsFromView =
      data.product_id_rel && data.product_name
        ? {
            id: data.product_id_rel,
            name: data.product_name,
            ref: data.product_ref || '',
            description: data.product_description || null,
          }
        : undefined

    const pricesFromView =
      data.price_id_rel && data.price_amount !== undefined
        ? {
            id: data.price_id_rel,
            amount: data.price_amount,
            currency: data.price_currency || 'BRL',
            recurring: data.price_recurring || false,
            interval: data.price_interval || null,
            interval_count: data.price_interval_count || null,
          }
        : undefined

    const profileId = (data as { profile_id?: string }).profile_id
    const profileEmail = (data as { profile_email?: string }).profile_email
    const profilesFromView =
      profileId != null && profileEmail != null
        ? {
            id: profileId,
            email: profileEmail,
            name: (data as { profile_name?: string | null }).profile_name ?? null,
          }
        : undefined

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
      metadata: data.metadata,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Relações - pode vir como array (select direto) ou colunas simples (view)
      products: productsFromView
        ? productsFromView
        : Array.isArray(data.products)
          ? data.products[0] || undefined
          : data.products && typeof data.products === 'object' && 'id' in data.products
            ? data.products
            : undefined,
      prices: pricesFromView
        ? pricesFromView
        : Array.isArray(data.prices)
          ? data.prices[0] || undefined
          : data.prices && typeof data.prices === 'object' && 'id' in data.prices
            ? data.prices
            : undefined,
      profiles: profilesFromView,
    }
  }
}
