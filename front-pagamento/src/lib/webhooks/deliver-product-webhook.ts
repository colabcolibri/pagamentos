import type { PaymentConfirmedWebhookPayload } from '@quitou/core'

import { recordAndDeliverWebhook } from '@/lib/checkout-sessions/webhook-deliveries'
import { getPool } from '@/lib/db/pool'
import { getLogger } from '@/lib/logger'
import { decryptStoredSecret } from '@/lib/security/secret-box'

export interface DeliverProductWebhookResult {
  dispatched: boolean
  delivered: boolean
  deliveryId?: string
  reason?: string
}

interface OrderWebhookRow {
  id: string
  user_id: string
  product_id: string
  price_id: string | null
  subscription_id: string | null
  order_type: string
  status: string
  amount_cents: number
  payment_method: string | null
  payment_gateway: string
  paid_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user_email: string
  user_name: string | null
  product_ref: string
  product_name: string
  webhook_url: string | null
  webhook_secret: string | null
  price_ref: string | null
  price_amount: number | null
  price_currency: string | null
  price_recurring: boolean | null
  price_interval: string | null
  price_interval_count: number | null
}

function normalizeGateway(value: string): 'pagarme' | 'asaas' {
  return value.toLowerCase() === 'pagarme' ? 'pagarme' : 'asaas'
}

function normalizeOrderType(value: string): 'one_time' | 'subscription' {
  return value === 'subscription' ? 'subscription' : 'one_time'
}

function metadataAsRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/**
 * Registra em `payments.webhook_deliveries` e envia o webhook `payment.confirmed`
 * para `products.webhook_url` quando um pedido de catálogo é confirmado.
 * Não lança exceção em falhas de rede/configuração — apenas registra o resultado.
 */
export async function deliverProductWebhookForOrder(
  orderId: string
): Promise<DeliverProductWebhookResult> {
  const logger = getLogger()

  try {
    const res = await getPool().query<OrderWebhookRow>(
      `SELECT
         o.id, o.user_id, o.product_id, o.price_id, o.subscription_id, o.order_type,
         o.status, o.amount_cents, o.payment_method, o.payment_gateway, o.paid_at,
         o.metadata, o.created_at,
         pr.email AS user_email, pr.name AS user_name,
         p.ref AS product_ref, p.name AS product_name, p.webhook_url, p.webhook_secret,
         px.ref AS price_ref, px.amount AS price_amount, px.currency AS price_currency,
         px.recurring AS price_recurring, px.interval AS price_interval,
         px.interval_count AS price_interval_count
       FROM payments.orders o
       JOIN payments.profiles pr ON pr.id = o.user_id
       JOIN payments.products p ON p.id = o.product_id
       LEFT JOIN payments.prices px ON px.id = o.price_id
       WHERE o.id = $1
       LIMIT 1`,
      [orderId]
    )

    const row = res.rows[0]
    if (!row) {
      return { dispatched: false, delivered: false, reason: 'Pedido não encontrado' }
    }

    if (row.status !== 'paid') {
      return { dispatched: false, delivered: false, reason: 'Pedido ainda não está pago' }
    }

    const webhookUrl = row.webhook_url?.trim() ?? ''
    if (!webhookUrl) {
      return { dispatched: false, delivered: false, reason: 'Produto sem webhook_url configurada' }
    }

    const webhookSecret = decryptStoredSecret(row.webhook_secret)?.trim() || null

    const payload: PaymentConfirmedWebhookPayload = {
      event: 'payment.confirmed',
      sent_at: new Date().toISOString(),
      order: {
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        price_id: row.price_id ?? '',
        subscription_id: row.subscription_id,
        order_type: normalizeOrderType(row.order_type),
        status: 'paid',
        amount_cents: row.amount_cents,
        payment_method: row.payment_method ?? 'unknown',
        payment_gateway: normalizeGateway(row.payment_gateway),
        paid_at: row.paid_at ?? new Date().toISOString(),
        metadata: metadataAsRecord(row.metadata),
        created_at: row.created_at,
      },
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name || 'Cliente',
      },
      product: {
        id: row.product_id,
        ref: row.product_ref,
        name: row.product_name,
      },
      price: {
        id: row.price_id ?? '',
        ref: row.price_ref ?? '',
        amount: row.price_amount ?? row.amount_cents,
        currency: row.price_currency ?? 'BRL',
        recurring: Boolean(row.price_recurring),
        interval: row.price_interval,
        interval_count: row.price_interval_count,
      },
    }

    const eventId = `evt_order_${row.id}`
    const result = await recordAndDeliverWebhook({
      eventId,
      checkoutSessionId: null,
      orderId: row.id,
      productId: row.product_id,
      targetUrl: webhookUrl,
      payload: payload as unknown as Record<string, unknown>,
      secret: webhookSecret,
    })

    return {
      dispatched: true,
      delivered: result.delivered,
      deliveryId: result.deliveryId,
    }
  } catch (error) {
    logger.error('Erro inesperado ao registrar/enviar webhook outbound do produto', error, {
      module: 'webhooks',
      action: 'deliver-product-webhook',
      orderId,
    })
    return {
      dispatched: false,
      delivered: false,
      reason: error instanceof Error ? error.message : 'Erro inesperado',
    }
  }
}
