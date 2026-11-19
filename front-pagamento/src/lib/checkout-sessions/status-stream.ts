import { getPool } from '@/lib/db/pool'

import { hashCheckoutSecret } from './api-keys'
import type { CheckoutSessionStatus } from './types'

export interface MinimalSessionStatusEvent {
  status: CheckoutSessionStatus | 'expired'
  paid: boolean
  amountCents: number | null
  completedAt: string | null
  successUrl: string | null
}

export async function readMinimalSessionStatusByToken(
  token: string
): Promise<MinimalSessionStatusEvent | null> {
  const tokenHash = hashCheckoutSecret(token)
  const res = await getPool().query<{
    status: CheckoutSessionStatus
    amount_cents: number | null
    completed_at: string | null
    success_url: string | null
    expires_at: string
  }>(
    `SELECT status, amount_cents, completed_at, success_url, expires_at
     FROM payments.checkout_sessions
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  )
  const row = res.rows[0]
  if (!row) return null
  const isExpired = row.status !== 'completed' && new Date(row.expires_at).getTime() <= Date.now()
  return {
    status: isExpired ? 'expired' : row.status,
    paid: row.status === 'completed',
    amountCents: row.amount_cents,
    completedAt: row.completed_at,
    successUrl: row.success_url,
  }
}

export async function readMinimalSessionStatusById(input: {
  sessionId: string
  allowedProductIds: string[] | null
}): Promise<{ found: boolean; forbidden: boolean; event: MinimalSessionStatusEvent | null }> {
  const res = await getPool().query<{
    product_id: string
    status: CheckoutSessionStatus
    amount_cents: number | null
    completed_at: string | null
    success_url: string | null
    expires_at: string
  }>(
    `SELECT product_id, status, amount_cents, completed_at, success_url, expires_at
     FROM payments.checkout_sessions
     WHERE id = $1
     LIMIT 1`,
    [input.sessionId]
  )
  const row = res.rows[0]
  if (!row) return { found: false, forbidden: false, event: null }
  if (input.allowedProductIds !== null && !input.allowedProductIds.includes(row.product_id)) {
    return { found: true, forbidden: true, event: null }
  }
  const isExpired = row.status !== 'completed' && new Date(row.expires_at).getTime() <= Date.now()
  return {
    found: true,
    forbidden: false,
    event: {
      status: isExpired ? 'expired' : row.status,
      paid: row.status === 'completed',
      amountCents: row.amount_cents,
      completedAt: row.completed_at,
      successUrl: row.success_url,
    },
  }
}

export function createSessionStatusSseStream(options: {
  loadStatus: () => Promise<MinimalSessionStatusEvent | null>
  signal: AbortSignal
  intervalMs?: number
  maxDurationMs?: number
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const intervalMs = options.intervalMs ?? 2000
  const maxDurationMs = options.maxDurationMs ?? 60_000

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let lastSerialized = ''
      let timer: ReturnType<typeof setInterval> | null = null
      let timeout: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (closed) return
        closed = true
        if (timer) clearInterval(timer)
        if (timeout) clearTimeout(timeout)
        try {
          controller.close()
        } catch {
          // Já fechado
        }
      }

      const pushCheck = async () => {
        if (closed || options.signal.aborted) {
          cleanup()
          return
        }
        try {
          const snapshot = await options.loadStatus()
          if (!snapshot) {
            cleanup()
            return
          }
          const serialized = JSON.stringify(snapshot)
          if (serialized !== lastSerialized) {
            lastSerialized = serialized
            controller.enqueue(encoder.encode(`event: status\ndata: ${serialized}\n\n`))
          }
          if (
            snapshot.status === 'completed' ||
            snapshot.status === 'expired' ||
            snapshot.status === 'cancelled'
          ) {
            cleanup()
          }
        } catch {
          cleanup()
        }
      }

      options.signal.addEventListener('abort', cleanup, { once: true })
      void pushCheck()
      timer = setInterval(() => {
        void pushCheck()
      }, intervalMs)
      timeout = setTimeout(cleanup, maxDurationMs)
    },
  })
}
