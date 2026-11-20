import { getPool } from '@/lib/db/pool'
import { getLogger } from '@/lib/logger'
import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'
import { decryptStoredSecret } from '@/lib/security/secret-box'

import type { WebhookDeliveryStatus } from './types'
import { signOutboundWebhookPayload } from './webhook-complete'

const MAX_ERROR_LEN = 500
const MAX_RETRY_ATTEMPTS = 8

function computeNextRetryAt(attempts: number): string {
  const backoffSeconds = Math.min(3600, 60 * Math.pow(2, Math.max(0, attempts - 1)))
  return new Date(Date.now() + backoffSeconds * 1000).toISOString()
}

export async function executeWebhookDeliveryAttempt(params: {
  deliveryId: string
  eventId: string
  targetUrl: string
  payload: Record<string, unknown>
  secret: string | null
  attemptsBefore: number
}): Promise<{ ok: boolean; httpStatus: number | null; error: string | null }> {
  if (!isUrlSafeForServerSideFetch(params.targetUrl)) {
    const err = 'URL de webhook bloqueada pela política de segurança'
    await getPool().query(
      `UPDATE payments.webhook_deliveries
       SET status = 'failed', attempts = attempts + 1, last_error = $1, next_retry_at = NULL, updated_at = now()
       WHERE id = $2`,
      [err, params.deliveryId]
    )
    return { ok: false, httpStatus: null, error: err }
  }

  if (!params.secret || !params.secret.trim()) {
    const err = 'Segredo de webhook (webhook_secret) não configurado no produto'
    await getPool().query(
      `UPDATE payments.webhook_deliveries
       SET status = 'failed', attempts = attempts + 1, last_error = $1, next_retry_at = NULL, updated_at = now()
       WHERE id = $2`,
      [err, params.deliveryId]
    )
    return { ok: false, httpStatus: null, error: err }
  }

  const body = JSON.stringify(params.payload)
  const signature = `sha256=${signOutboundWebhookPayload(body, params.secret)}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Quitou-Webhook/1.0',
    'X-Quitou-Event': 'payment.confirmed',
    'X-Quitou-Event-Id': params.eventId,
    'X-Quitou-Signature': signature,
    'X-Webhook-Event': 'payment.confirmed',
    'X-Webhook-Id': params.eventId,
    'X-Webhook-Signature': signature,
  }

  const nextAttempts = params.attemptsBefore + 1
  try {
    const res = await fetch(params.targetUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      await getPool().query(
        `UPDATE payments.webhook_deliveries
         SET status = 'delivered',
             attempts = $1,
             http_status = $2,
             last_error = NULL,
             next_retry_at = NULL,
             delivered_at = COALESCE(delivered_at, now()),
             updated_at = now()
         WHERE id = $3`,
        [nextAttempts, res.status, params.deliveryId]
      )
      return { ok: true, httpStatus: res.status, error: null }
    }

    const errText = `HTTP ${res.status}`.slice(0, MAX_ERROR_LEN)
    await getPool().query(
      `UPDATE payments.webhook_deliveries
       SET status = 'failed',
           attempts = $1,
           http_status = $2,
           last_error = $3,
           next_retry_at = $4,
           updated_at = now()
       WHERE id = $5`,
      [
        nextAttempts,
        res.status,
        errText,
        nextAttempts < MAX_RETRY_ATTEMPTS ? computeNextRetryAt(nextAttempts) : null,
        params.deliveryId,
      ]
    )
    return { ok: false, httpStatus: res.status, error: errText }
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LEN)
    getLogger().error(
      'Falha ao entregar webhook outbound',
      error instanceof Error ? error : new Error(message)
    )
    await getPool().query(
      `UPDATE payments.webhook_deliveries
       SET status = 'failed',
           attempts = $1,
           http_status = NULL,
           last_error = $2,
           next_retry_at = $3,
           updated_at = now()
       WHERE id = $4`,
      [
        nextAttempts,
        message,
        nextAttempts < MAX_RETRY_ATTEMPTS ? computeNextRetryAt(nextAttempts) : null,
        params.deliveryId,
      ]
    )
    return { ok: false, httpStatus: null, error: message }
  }
}

export async function recordAndDeliverWebhook(input: {
  eventId: string
  checkoutSessionId: string | null
  orderId: string
  productId: string
  targetUrl: string
  payload: Record<string, unknown>
  secret: string | null
}): Promise<{ deliveryId: string; delivered: boolean }> {
  const pool = getPool()
  const upsert = await pool.query<{
    id: string
    status: WebhookDeliveryStatus
    attempts: number
  }>(
    `INSERT INTO payments.webhook_deliveries (
       event_id, checkout_session_id, order_id, product_id, target_url, status, payload
     ) VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb)
     ON CONFLICT (event_id, target_url)
     DO UPDATE SET updated_at = now()
     RETURNING id, status, attempts`,
    [
      input.eventId,
      input.checkoutSessionId,
      input.orderId,
      input.productId,
      input.targetUrl,
      JSON.stringify(input.payload),
    ]
  )

  const row = upsert.rows[0]!
  if (row.status === 'delivered') {
    return { deliveryId: row.id, delivered: true }
  }

  const attempt = await executeWebhookDeliveryAttempt({
    deliveryId: row.id,
    eventId: input.eventId,
    targetUrl: input.targetUrl,
    payload: input.payload,
    secret: input.secret,
    attemptsBefore: row.attempts,
  })
  return { deliveryId: row.id, delivered: attempt.ok }
}

export async function retryWebhookDeliveryById(deliveryId: string): Promise<{
  found: boolean
  delivered: boolean
  httpStatus: number | null
  error: string | null
}> {
  const res = await getPool().query<{
    id: string
    event_id: string
    target_url: string
    attempts: number
    payload: Record<string, unknown>
    webhook_secret: string | null
  }>(
    `SELECT wd.id, wd.event_id, wd.target_url, wd.attempts, wd.payload, p.webhook_secret
     FROM payments.webhook_deliveries wd
     JOIN payments.products p ON p.id = wd.product_id
     WHERE wd.id = $1
     LIMIT 1`,
    [deliveryId]
  )

  const row = res.rows[0]
  if (!row) return { found: false, delivered: false, httpStatus: null, error: 'Não encontrado' }

  const secret = decryptStoredSecret(row.webhook_secret)
  const attempt = await executeWebhookDeliveryAttempt({
    deliveryId: row.id,
    eventId: row.event_id,
    targetUrl: row.target_url,
    payload: row.payload,
    secret,
    attemptsBefore: row.attempts,
  })

  return {
    found: true,
    delivered: attempt.ok,
    httpStatus: attempt.httpStatus,
    error: attempt.error,
  }
}

export async function retryPendingWebhookDeliveries(limit = 20): Promise<number> {
  const res = await getPool().query<{ id: string }>(
    `SELECT id
     FROM payments.webhook_deliveries
     WHERE status IN ('pending', 'failed')
       AND attempts < $1
       AND (next_retry_at IS NULL OR next_retry_at <= now())
     ORDER BY created_at ASC
     LIMIT $2`,
    [MAX_RETRY_ATTEMPTS, limit]
  )

  let deliveredCount = 0
  for (const row of res.rows) {
    const out = await retryWebhookDeliveryById(row.id)
    if (out.delivered) deliveredCount += 1
  }
  return deliveredCount
}

export async function listWebhookDeliveries(status?: WebhookDeliveryStatus) {
  const params: unknown[] = []
  const where = status ? 'WHERE wd.status = $1' : ''
  if (status) params.push(status)

  const res = await getPool().query<{
    id: string
    event_id: string
    checkout_session_id: string | null
    order_id: string
    product_id: string
    product_name: string
    target_url: string
    status: WebhookDeliveryStatus
    attempts: number
    http_status: number | null
    last_error: string | null
    next_retry_at: string | null
    delivered_at: string | null
    created_at: string
    payload: Record<string, unknown>
  }>(
    `SELECT
       wd.id, wd.event_id, wd.checkout_session_id, wd.order_id, wd.product_id,
       p.name AS product_name, wd.target_url, wd.status, wd.attempts,
       wd.http_status, wd.last_error, wd.next_retry_at, wd.delivered_at, wd.created_at,
       wd.payload
     FROM payments.webhook_deliveries wd
     JOIN payments.products p ON p.id = wd.product_id
     ${where}
     ORDER BY wd.created_at DESC
     LIMIT 100`,
    params
  )

  return res.rows
}
