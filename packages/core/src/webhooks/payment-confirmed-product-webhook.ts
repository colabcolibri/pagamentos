/**
 * Webhook outbound: POST para products.webhook_url quando o pedido está paid.
 * Não lança — falhas são apenas logadas (não deve quebrar o webhook do gateway).
 */
import { createHmac, randomUUID } from 'node:crypto'

import { getLogger } from '../logger'
import { decryptStoredSecret } from '../security/secret-box'
import { isPublicHttpsWebhookUrl, webhookUrlLooksPublic } from './public-webhook-url'

export { isPublicHttpsWebhookUrl, webhookUrlLooksPublic }
import type { PaymentConfirmedWebhookPayload } from '../types'

const logger = getLogger()

const WEBHOOK_TIMEOUT_MS = 20_000

export function buildPaymentConfirmedWebhookSignature(secret: string, rawBody: string): string {
  const hash = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  return `sha256=${hash}`
}

function normalizePaymentGateway(value: string): 'pagarme' | 'asaas' {
  const v = value.toLowerCase()
  if (v === 'pagarme' || v === 'asaas') {
    return v
  }
  logger.warn('payment_gateway inesperado no pedido; usando asaas no payload outbound', {
    module: 'webhooks',
    action: 'payment-confirmed-product-webhook',
    value,
  })
  return 'asaas'
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

export async function sendPaymentConfirmedProductWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orderId: string
): Promise<void> {
  try {
    const { data: row, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        product_id,
        price_id,
        subscription_id,
        order_type,
        status,
        amount_cents,
        payment_method,
        payment_gateway,
        paid_at,
        metadata,
        created_at,
        prices!inner (
          id,
          ref,
          amount,
          currency,
          recurring,
          interval,
          interval_count,
          products!inner (
            id,
            ref,
            name,
            webhook_url,
            webhook_secret
          )
        )
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError || !row) {
      logger.error('Outbound webhook: pedido não encontrado', orderError, {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
      })
      return
    }

    if (row.status !== 'paid') {
      logger.warn('Outbound webhook ignorado: order não está paid', {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
        status: row.status,
      })
      return
    }

    const price = row.prices as {
      id: string
      ref: string
      amount: number
      currency: string | null
      recurring: boolean | null
      interval: string | null
      interval_count: number | null
      products: {
        id: string
        ref: string
        name: string
        webhook_url: string | null
        webhook_secret: string | null
      }
    }

    const product = price?.products
    if (!product || !price) {
      logger.error('Outbound webhook: dados de preço/produto ausentes', undefined, {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
      })
      return
    }

    const webhookUrl = product.webhook_url?.trim() ?? ''
    const webhookSecret = decryptStoredSecret(product.webhook_secret) ?? ''
    if (!webhookUrl || !webhookSecret) {
      logger.info('Outbound webhook não configurado (url ou secret vazio)', {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
        productId: product.id,
      })
      return
    }

    if (!(await isPublicHttpsWebhookUrl(webhookUrl))) {
      logger.error('Outbound webhook: URL recusada', undefined, {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
        productId: product.id,
      })
      return
    }

    const { data: user, error: userError } = await supabase
      .schema('payments')
      .from('profiles')
      .select('id, email, name')
      .eq('id', row.user_id)
      .single()

    if (userError || !user?.email) {
      logger.error('Outbound webhook: perfil/email não encontrado', userError, {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
      })
      return
    }

    const payload: PaymentConfirmedWebhookPayload = {
      event: 'payment.confirmed',
      sent_at: new Date().toISOString(),
      order: {
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        price_id: row.price_id,
        subscription_id: row.subscription_id,
        order_type: normalizeOrderType(row.order_type),
        status: 'paid',
        amount_cents: row.amount_cents,
        payment_method: row.payment_method,
        payment_gateway: normalizePaymentGateway(row.payment_gateway),
        paid_at: row.paid_at,
        metadata: metadataAsRecord(row.metadata),
        created_at: row.created_at,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Cliente',
      },
      product: {
        id: product.id,
        ref: product.ref,
        name: product.name,
      },
      price: {
        id: price.id,
        ref: price.ref,
        amount: price.amount,
        currency: price.currency ?? 'BRL',
        recurring: Boolean(price.recurring),
        interval: price.interval,
        interval_count: price.interval_count,
      },
    }

    const body = JSON.stringify(payload)
    const signature = buildPaymentConfirmedWebhookSignature(webhookSecret, body)
    const webhookId = randomUUID()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Quitou-Webhook/1.0',
          'X-Webhook-Event': 'payment.confirmed',
          'X-Webhook-Id': webhookId,
          'X-Webhook-Signature': signature,
        },
        body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      logger.error('Outbound webhook retornou status não-2xx', undefined, {
        module: 'webhooks',
        action: 'payment-confirmed-product-webhook',
        orderId,
        status: response.status,
        webhookId,
      })
      return
    }

    logger.info('Outbound webhook payment.confirmed enviado', {
      module: 'webhooks',
      action: 'payment-confirmed-product-webhook',
      orderId,
      webhookId,
    })
  } catch (err) {
    logger.error('Falha ao enviar outbound webhook payment.confirmed', err, {
      module: 'webhooks',
      action: 'payment-confirmed-product-webhook',
      orderId,
    })
  }
}
