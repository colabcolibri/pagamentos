import type { Database, Json } from './supabase-types'

/**
 * Gateway de pagamento
 */
export type PaymentGateway = 'pagarme' | 'asaas'

/**
 * Método de pagamento
 */
export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'asaas_boleto_parcelado' | string

/**
 * Status do pagamento
 */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired'
  | 'incomplete'

/**
 * Tipo de pagamento
 */
export type PaymentType = 'subscription' | 'one_time'

/**
 * Metadata do pagamento
 */
export interface PaymentMetadata {
  coupon_code?: string
  affiliate_id?: string
  utm_source?: string
  utm_campaign?: string
  notes?: string
  refund_policy_accepted?: boolean
  refund_policy_acceptance_date?: string
  [key: string]: any
}

/**
 * Pagamento Pagar.me
 */
export interface PagarmePayment {
  id: string
  user_id: string
  product_id: string
  price_id: string
  order_id: string | null
  payment_link_id: string | null
  payment_link_url: string | null
  status: PaymentStatus
  amount_cents: number
  currency: string
  expires_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

/**
 * Pagamento Asaas
 */
export interface AsaasPayment {
  id: string
  user_id: string
  product_id: string
  price_id: string
  order_id: string | null
  invoice_id: string | null
  invoice_url: string | null
  status: PaymentStatus
  amount_cents: number
  currency: string
  expires_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

/**
 * DTO para criar pagamento
 */
export interface CreatePaymentDTO {
  user_id: string
  product_id: string
  price_id: string
  order_id?: string | null
  amount_cents: number
  currency: string
  gateway: PaymentGateway
  expires_at?: string | null
  metadata?: PaymentMetadata | null
}

/**
 * DTO para atualizar pagamento
 */
export interface UpdatePaymentDTO {
  status?: PaymentStatus
  payment_link_id?: string | null
  payment_link_url?: string | null
  invoice_id?: string | null
  invoice_url?: string | null
  paid_at?: string | null
  cancelled_at?: string | null
  expires_at?: string | null
  metadata?: PaymentMetadata | null
}

/**
 * Opções de query para buscar pagamentos
 */
export interface PaymentQueryOptions {
  userId?: string
  productId?: string
  priceId?: string
  orderId?: string
  status?: PaymentStatus | PaymentStatus[]
  gateway?: PaymentGateway
  orderBy?: 'created_at' | 'updated_at' | 'paid_at' | 'amount_cents'
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Tipos do banco de dados
 */
export type DbPagarmePayment = Database['payments']['Tables']['pagarme_payments']['Row']
export type DbPagarmePaymentInsert = Database['payments']['Tables']['pagarme_payments']['Insert']
export type DbPagarmePaymentUpdate = Database['payments']['Tables']['pagarme_payments']['Update']

export type DbAsaasPayment = Database['payments']['Tables']['asaas_payments']['Row']
export type DbAsaasPaymentInsert = Database['payments']['Tables']['asaas_payments']['Insert']
export type DbAsaasPaymentUpdate = Database['payments']['Tables']['asaas_payments']['Update']

