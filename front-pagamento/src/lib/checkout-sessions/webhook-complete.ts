import crypto from 'node:crypto'

import { getPool } from '@/lib/db/pool'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'
import { decryptStoredSecret } from '@/lib/security/secret-box'

import { recordAndDeliverWebhook } from './webhook-deliveries'

export function signOutboundWebhookPayload(payloadJson: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadJson, 'utf8').digest('hex')
}

export async function completeCheckoutSessionForOrder(orderId: string): Promise<{
  closedSessionId: string | null
  customWebhookSent: boolean
}> {
  const pool = getPool()
  const updated = await pool.query<{
    id: string
    pricing_mode: 'catalog' | 'custom'
    price_id: string | null
    amount_cents: number | null
    metadata: Record<string, unknown> | null
  }>(
    `UPDATE payments.checkout_sessions
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now()),
         updated_at = now()
     WHERE order_id = $1
       AND status <> 'completed'
     RETURNING id, pricing_mode, price_id, amount_cents, metadata`,
    [orderId]
  )

  const session = updated.rows[0]
  if (!session) {
    return { closedSessionId: null, customWebhookSent: false }
  }

  // No modo catalog com price_id, o sendPaymentConfirmedProductWebhook padrão cuida do envio.
  if (session.price_id) {
    return { closedSessionId: session.id, customWebhookSent: false }
  }

  // No modo custom (price_id IS NULL), registramos e disparamos o webhook canônico HMAC.
  const orderRes = await pool.query<{
    id: string
    amount_cents: number
    paid_at: string | null
    payment_method: string | null
    payment_gateway: string
    metadata: Record<string, unknown> | null
    user_email: string
    user_name: string | null
    product_id: string
    product_ref: string
    product_name: string
    webhook_url: string | null
    webhook_secret: string | null
  }>(
    `SELECT
       o.id, o.amount_cents, o.paid_at, o.payment_method, o.payment_gateway, o.metadata,
       pr.email AS user_email, pr.name AS user_name,
       p.id AS product_id, p.ref AS product_ref, p.name AS product_name,
       p.webhook_url, p.webhook_secret
     FROM payments.orders o
     JOIN payments.profiles pr ON pr.id = o.user_id
     JOIN payments.products p ON p.id = o.product_id
     WHERE o.id = $1
     LIMIT 1`,
    [orderId]
  )

  const order = orderRes.rows[0]
  if (!order || !order.webhook_url || !isUrlSafeForServerSideFetch(order.webhook_url)) {
    return { closedSessionId: session.id, customWebhookSent: false }
  }

  const secret = decryptStoredSecret(order.webhook_secret)
  const eventId = `evt_${order.id}_${session.id}`
  const payload = {
    event: 'payment.confirmed',
    eventId,
    occurredAt: order.paid_at ?? new Date().toISOString(),
    checkoutSessionId: session.id,
    amountCents: order.amount_cents,
    subject: {
      email: order.user_email,
      name: order.user_name,
    },
    product: {
      id: order.product_id,
      ref: order.product_ref,
      name: order.product_name,
    },
    order: {
      id: order.id,
      amountCents: order.amount_cents,
      paymentMethod: order.payment_method,
      paymentGateway: order.payment_gateway,
    },
    metadata: session.metadata ?? order.metadata ?? {},
  }

  const delivered = await recordAndDeliverWebhook({
    eventId,
    checkoutSessionId: session.id,
    orderId: order.id,
    productId: order.product_id,
    targetUrl: order.webhook_url,
    payload,
    secret,
  })

  return { closedSessionId: session.id, customWebhookSent: delivered.delivered }
}
