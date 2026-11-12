import type { Order as BaseOrder } from '@/lib/payments/order'

/**
 * Order type usado nos componentes admin
 * Compatível com Order do domínio, mas com campos não-null para compatibilidade
 */
export interface Order extends Omit<BaseOrder, 'created_at' | 'updated_at'> {
  created_at: string
  updated_at: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'
}

export type OrderStatus = Order['status']
export type PaymentGateway = Order['payment_gateway']
export type OrderType = Order['order_type']
