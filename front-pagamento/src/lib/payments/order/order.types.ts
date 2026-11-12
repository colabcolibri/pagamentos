import type { Database, Json } from '@db/database.types'

/**
 * Status do pedido
 */
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'

/**
 * Tipo de pedido
 */
export type OrderType = 'subscription' | 'one_time'

/**
 * Gateway de pagamento
 */
export type PaymentGateway = 'pagarme' | 'asaas'

/**
 * Método de pagamento
 */
export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | string

/**
 * Relações do pedido
 */
export interface OrderRelations {
  profiles?: {
    id: string
    email: string
    name: string | null
  }
  products?: {
    id: string
    name: string
    ref: string
  }
  prices?: {
    id: string
    amount: number
    currency: string
    recurring: boolean
    interval: string | null
    interval_count: number | null
  }
}

/**
 * Pedido completo com relações opcionais
 */
export interface Order {
  id: string
  user_id: string
  product_id: string
  price_id: string
  subscription_id: string | null
  order_type: OrderType
  status: OrderStatus
  amount_cents: number
  payment_method: PaymentMethod | null
  payment_gateway: PaymentGateway
  paid_at: string | null
  cancelled_at: string | null
  refunded_at: string | null
  expires_at: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
  // Relações opcionais
  profiles?: OrderRelations['profiles']
  products?: OrderRelations['products']
  prices?: OrderRelations['prices']
}

/**
 * DTO para criar pedido
 */
export interface CreateOrderDTO {
  user_id: string
  product_id: string
  price_id: string
  subscription_id?: string | null
  order_type: OrderType
  amount_cents: number
  payment_gateway: PaymentGateway
  payment_method?: PaymentMethod | null
  expires_at?: string | null
  metadata?: Json | null
}

/**
 * DTO para atualizar pedido
 */
export interface UpdateOrderDTO {
  status?: OrderStatus
  payment_method?: PaymentMethod | null
  paid_at?: string | null
  cancelled_at?: string | null
  refunded_at?: string | null
  expires_at?: string | null
  metadata?: Json | null
}

/**
 * Opções de query para buscar pedidos
 */
export interface OrderQueryOptions {
  userId?: string
  status?: OrderStatus | OrderStatus[]
  orderType?: OrderType
  paymentGateway?: PaymentGateway
  paymentMethod?: PaymentMethod
  includeRelations?: boolean
  orderBy?: 'created_at' | 'updated_at' | 'paid_at' | 'amount_cents'
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Tipos do banco de dados
 */
export type DbOrder = Database['payments']['Tables']['orders']['Row']
export type DbOrderInsert = Database['payments']['Tables']['orders']['Insert']
export type DbOrderUpdate = Database['payments']['Tables']['orders']['Update']
