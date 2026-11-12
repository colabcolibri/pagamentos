import type { SupabaseClient } from '../../types/query-client'

import type {
    AsaasPayment,
    CreatePaymentDTO,
    Database,
    DbAsaasPayment,
    DbAsaasPaymentInsert,
    DbAsaasPaymentUpdate,
    DbPagarmePayment,
    DbPagarmePaymentInsert,
    DbPagarmePaymentUpdate,
    PagarmePayment,
    PaymentQueryOptions,
    PaymentStatus,
    UpdatePaymentDTO,
} from '../types'
import type { PaymentRepository } from './payment.repository.interface'

/**
 * Implementação Supabase do repositório de pagamentos
 */
export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ==========================================
  // Pagar.me Payments
  // ==========================================

  async findPagarmeById(id: string): Promise<PagarmePayment | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('pagarme_payments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return this.mapToPagarmePayment(data as unknown as DbPagarmePayment)
  }

  async findManyPagarme(options?: PaymentQueryOptions): Promise<PagarmePayment[]> {
    let query = this.supabase.schema('payments').from('pagarme_payments').select('*')

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

    return (data || []).map((item: any) => this.mapToPagarmePayment(item as unknown as DbPagarmePayment))
  }

  async createPagarme(data: CreatePaymentDTO): Promise<PagarmePayment> {
    const insertData: DbPagarmePaymentInsert = {
      user_id: data.user_id,
      product_id: data.product_id,
      price_id: data.price_id,
      order_id: data.order_id || null,
      amount_cents: data.amount_cents,
      payment_link_id: '', // Será preenchido após criar no Pagar.me
      payment_link_url: '', // Será preenchido após criar no Pagar.me
      status: 'pending',
      expires_at: data.expires_at || null,
      metadata: data.metadata || null,
    }

    const { data: payment, error } = await this.supabase
      .schema('payments')
      .from('pagarme_payments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!payment) {
      throw new Error('Pagamento não foi criado')
    }

    return this.mapToPagarmePayment(payment as unknown as DbPagarmePayment)
  }

  async updatePagarme(id: string, data: UpdatePaymentDTO): Promise<PagarmePayment> {
    const updateData: DbPagarmePaymentUpdate = {
      status: data.status || undefined,
      payment_link_id: data.payment_link_id || undefined,
      payment_link_url: data.payment_link_url || undefined,
      paid_at: data.paid_at || undefined,
      expires_at: data.expires_at || undefined,
      metadata: data.metadata || undefined,
    }

    const { data: payment, error } = await this.supabase
      .schema('payments')
      .from('pagarme_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!payment) {
      throw new Error('Pagamento não foi atualizado')
    }

    return this.mapToPagarmePayment(payment as unknown as DbPagarmePayment)
  }

  async existsPagarme(id: string): Promise<boolean> {
    const payment = await this.findPagarmeById(id)
    return payment !== null
  }

  // ==========================================
  // Asaas Payments
  // ==========================================

  async findAsaasById(id: string): Promise<AsaasPayment | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('asaas_payments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return this.mapToAsaasPayment(data as unknown as DbAsaasPayment)
  }

  async findManyAsaas(options?: PaymentQueryOptions): Promise<AsaasPayment[]> {
    let query = this.supabase.schema('payments').from('asaas_payments').select('*')

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

    return (data || []).map((item: any) => this.mapToAsaasPayment(item as unknown as DbAsaasPayment))
  }

  async createAsaas(data: CreatePaymentDTO): Promise<AsaasPayment> {
    const insertData: DbAsaasPaymentInsert = {
      user_id: data.user_id,
      product_id: data.product_id,
      price_id: data.price_id,
      order_id: data.order_id || null,
      amount_cents: data.amount_cents,
      asaas_payment_id: null, // Será preenchido após criar no Asaas
      boleto_url: null, // Será preenchido após criar no Asaas
      status: 'pending',
      billing_type: 'BOLETO', // Default para boleto parcelado
      asaas_customer_id: '', // Será preenchido após criar cliente
      subscription_id: '', // Obrigatório na tabela, será preenchido se necessário
      metadata: data.metadata || null,
    }

    const { data: payment, error } = await this.supabase
      .schema('payments')
      .from('asaas_payments')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!payment) {
      throw new Error('Pagamento não foi criado')
    }

    return this.mapToAsaasPayment(payment as unknown as DbAsaasPayment)
  }

  async updateAsaas(id: string, data: UpdatePaymentDTO): Promise<AsaasPayment> {
    const updateData: DbAsaasPaymentUpdate = {
      status: data.status || undefined,
      asaas_payment_id: data.invoice_id || undefined, // invoice_id mapeia para asaas_payment_id
      boleto_url: data.invoice_url || undefined, // invoice_url mapeia para boleto_url
      paid_at: data.paid_at || undefined,
      metadata: data.metadata || undefined,
    }

    const { data: payment, error } = await this.supabase
      .schema('payments')
      .from('asaas_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!payment) {
      throw new Error('Pagamento não foi atualizado')
    }

    return this.mapToAsaasPayment(payment as unknown as DbAsaasPayment)
  }

  async existsAsaas(id: string): Promise<boolean> {
    const payment = await this.findAsaasById(id)
    return payment !== null
  }

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Aplica filtros na query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, options?: PaymentQueryOptions): any {
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options?.productId) {
      query = query.eq('product_id', options.productId)
    }

    if (options?.priceId) {
      query = query.eq('price_id', options.priceId)
    }

    if (options?.orderId) {
      query = query.eq('order_id', options.orderId)
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status)
      } else {
        query = query.eq('status', options.status)
      }
    }

    return query
  }

  /**
   * Mapeia dados do banco para PagarmePayment
   */
  private mapToPagarmePayment(data: DbPagarmePayment): PagarmePayment {
    return {
      id: data.id,
      user_id: data.user_id,
      product_id: data.product_id || '',
      price_id: data.price_id,
      order_id: data.order_id,
      payment_link_id: data.payment_link_id,
      payment_link_url: data.payment_link_url,
      status: (data.status || 'pending') as PaymentStatus,
      amount_cents: data.amount_cents,
      currency: 'BRL', // Default, pode vir do price
      expires_at: data.expires_at,
      paid_at: data.paid_at,
      cancelled_at: null, // Não existe na tabela atual
      metadata: data.metadata,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    }
  }

  /**
   * Mapeia dados do banco para AsaasPayment
   */
  private mapToAsaasPayment(data: DbAsaasPayment): AsaasPayment {
    return {
      id: data.id,
      user_id: data.user_id,
      product_id: data.product_id || '',
      price_id: data.price_id,
      order_id: data.order_id,
      invoice_id: data.asaas_payment_id,
      invoice_url: data.boleto_url,
      status: (data.status || 'pending') as PaymentStatus,
      amount_cents: data.amount_cents,
      currency: 'BRL', // Default
      expires_at: null, // Não existe na tabela atual
      paid_at: data.paid_at,
      cancelled_at: null, // Não existe na tabela atual
      metadata: data.metadata,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    }
  }
}

