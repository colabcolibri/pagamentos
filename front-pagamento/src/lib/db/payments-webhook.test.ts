import type { NextRequest } from 'next/server'

import { createAsaasWebhookHandler, createPagarmeWebhookHandler } from '@quitou/core'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { createPaymentsQueryClient } from './payments-query'
import { closePool, getPool } from './pool'

const here = dirname(fileURLToPath(import.meta.url))

function localDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL
  try {
    const envFile = readFileSync(join(here, '../../../../deploy/postgres/.env'), 'utf8')
    const values = Object.fromEntries(
      envFile
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=')
          return [line.slice(0, index), line.slice(index + 1)]
        })
    )
    const user = values.POSTGRES_USER
    const password = values.POSTGRES_PASSWORD
    const database = values.POSTGRES_DB || 'quitou'
    if (!user || !password) return undefined
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:5435/${database}`
  } catch {
    return undefined
  }
}

const databaseUrl = localDatabaseUrl()

function request(url: string, body: unknown, headers: Record<string, string>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe('webhooks no postgres', () => {
  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!databaseUrl)(
    'grava uma vez, ignora segredo inválido e estorno devolve o estoque',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const db = createPaymentsQueryClient(pool)
      const stamp = Date.now()
      const email = `wh-${stamp}@quitou.invalid`
      const profile = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Webhook') RETURNING id`,
        [email]
      )
      const userId = profile.rows[0]!.id
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name, active) VALUES ($1, 'Webhook', true) RETURNING id`,
        [`wh-${stamp}`]
      )
      const productId = product.rows[0]!.id
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, active, email_addon, stock_sold)
         VALUES ($1, $2, 10000, true, '{}'::jsonb, 0) RETURNING id`,
        [`wh-${stamp}-p`, productId]
      )
      const priceId = price.rows[0]!.id
      const order = await pool.query<{ id: string }>(
        `INSERT INTO payments.orders (
           user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway
         ) VALUES ($1, $2, $3, 10000, 'pending', 'one_time', 'asaas') RETURNING id`,
        [userId, productId, priceId]
      )
      const orderId = order.rows[0]!.id
      const paymentId = `pay_${stamp}`
      await pool.query(
        `INSERT INTO payments.asaas_payments (
           user_id, product_id, price_id, order_id, amount_cents, status,
           asaas_customer_id, asaas_payment_id, billing_type
         ) VALUES ($1, $2, $3, $4, 10000, 'pending', 'cus', $5, 'PIX')`,
        [userId, productId, priceId, orderId, paymentId]
      )

      const asaas = createAsaasWebhookHandler({
        supabase: createPaymentsQueryClient(pool),
        supabaseUrl: '',
        supabaseServiceRoleKey: '',
        validateToken: (token) => token === 'segredo-certo',
      })
      const payload = { event: 'PAYMENT_RECEIVED', payment: { id: paymentId, billingType: 'PIX' } }

      try {
        const denied = await asaas(
          request('http://localhost/asaas', payload, { 'asaas-access-token': 'errado' })
        )
        expect(denied.status).toBe(401)
        const before = await pool.query(
          `SELECT count(*)::int AS total FROM payments.webhook_events WHERE provider_event_id = $1`,
          [`asaas:${paymentId}:PAYMENT_RECEIVED`]
        )
        expect(before.rows[0]?.total).toBe(0)

        const first = await asaas(
          request('http://localhost/asaas', payload, { 'asaas-access-token': 'segredo-certo' })
        )
        expect(first.status).toBe(200)
        const paid = await pool.query<{ status: string; stock_sold: number }>(
          `SELECT o.status, pr.stock_sold
           FROM payments.orders o
           INNER JOIN payments.prices pr ON pr.id = o.price_id
           WHERE o.id = $1`,
          [orderId]
        )
        expect(paid.rows[0]?.status).toBe('paid')
        expect(paid.rows[0]?.stock_sold).toBe(1)

        const second = await asaas(
          request('http://localhost/asaas', payload, { 'asaas-access-token': 'segredo-certo' })
        )
        expect(second.status).toBe(200)
        const events = await pool.query(
          `SELECT count(*)::int AS total FROM payments.webhook_events WHERE provider_event_id = $1`,
          [`asaas:${paymentId}:PAYMENT_RECEIVED`]
        )
        expect(events.rows[0]?.total).toBe(1)
        const still = await pool.query<{ stock_sold: number }>(
          'SELECT stock_sold FROM payments.prices WHERE id = $1',
          [priceId]
        )
        expect(still.rows[0]?.stock_sold).toBe(1)

        const refund = await asaas(
          request(
            'http://localhost/asaas',
            { event: 'PAYMENT_REFUNDED', payment: { id: paymentId } },
            { 'asaas-access-token': 'segredo-certo' }
          )
        )
        expect(refund.status).toBe(200)
        const after = await pool.query<{ status: string; stock_sold: number }>(
          `SELECT o.status, pr.stock_sold
           FROM payments.orders o
           INNER JOIN payments.prices pr ON pr.id = o.price_id
           WHERE o.id = $1`,
          [orderId]
        )
        expect(after.rows[0]?.status).toBe('refunded')
        expect(after.rows[0]?.stock_sold).toBe(0)
      } finally {
        await pool.query(
          `UPDATE payments.asaas_payments SET status = 'cancelled' WHERE asaas_payment_id = $1`,
          [paymentId]
        )
        await pool.query('DELETE FROM payments.asaas_payments WHERE asaas_payment_id = $1', [
          paymentId,
        ])
        await pool.query('DELETE FROM payments.webhook_events WHERE provider_event_id LIKE $1', [
          `%${paymentId}%`,
        ])
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [orderId])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [priceId])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [productId])
        await pool.query('DELETE FROM payments.profiles WHERE id = $1', [userId])
      }
    },
    30_000
  )

  it.skipIf(!databaseUrl)(
    'Pagar.me com senha errada não grava e o pago entra uma vez',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const db = createPaymentsQueryClient(pool)
      const stamp = Date.now()
      const link = `link_${stamp}`
      const profile = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Pagarme') RETURNING id`,
        [`pm-${stamp}@quitou.invalid`]
      )
      const userId = profile.rows[0]!.id
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name) VALUES ($1, 'Pagarme') RETURNING id`,
        [`pm-${stamp}`]
      )
      const productId = product.rows[0]!.id
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, email_addon)
       VALUES ($1, $2, 5000, '{}'::jsonb) RETURNING id`,
        [`pm-${stamp}-p`, productId]
      )
      const priceId = price.rows[0]!.id
      const order = await pool.query<{ id: string }>(
        `INSERT INTO payments.orders (
         user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway
       ) VALUES ($1, $2, $3, 5000, 'pending', 'one_time', 'pagarme') RETURNING id`,
        [userId, productId, priceId]
      )
      const orderId = order.rows[0]!.id
      await pool.query(
        `INSERT INTO payments.pagarme_payments (
         user_id, product_id, price_id, order_id, amount_cents, status,
         payment_link_id, payment_link_url
       ) VALUES ($1, $2, $3, $4, 5000, 'pending', $5, 'https://pay.example/x')`,
        [userId, productId, priceId, orderId, link]
      )
      const handler = createPagarmeWebhookHandler({
        supabase: createPaymentsQueryClient(pool),
        supabaseUrl: '',
        supabaseServiceRoleKey: '',
        validateAuth: (user, password) => user === 'quitou' && password === 'segredo',
      })
      const payload = {
        type: 'order.paid',
        data: { id: `or_${stamp}`, code: link, charges: [{ payment_method: 'pix' }] },
      }
      const auth = `Basic ${Buffer.from('quitou:segredo').toString('base64')}`

      try {
        const denied = await handler(
          request('http://localhost/pagarme', payload, {
            authorization: `Basic ${Buffer.from('quitou:errado').toString('base64')}`,
          })
        )
        expect(denied.status).toBe(401)
        const none = await pool.query(
          `SELECT count(*)::int AS total FROM payments.webhook_events WHERE provider_event_id = $1`,
          [`pagarme:or_${stamp}:order.paid`]
        )
        expect(none.rows[0]?.total).toBe(0)

        const paid = await handler(
          request('http://localhost/pagarme', payload, { authorization: auth })
        )
        expect(paid.status).toBe(200)
        const again = await handler(
          request('http://localhost/pagarme', payload, { authorization: auth })
        )
        expect(again.status).toBe(200)
        const rows = await pool.query<{ status: string; total: number }>(
          `SELECT p.status, (
           SELECT count(*)::int FROM payments.webhook_events e WHERE e.provider_event_id = $2
         ) AS total
         FROM payments.pagarme_payments p WHERE p.payment_link_id = $1`,
          [link, `pagarme:or_${stamp}:order.paid`]
        )
        expect(rows.rows[0]?.status).toBe('paid')
        expect(rows.rows[0]?.total).toBe(1)
      } finally {
        await pool.query(
          `UPDATE payments.pagarme_payments SET status = 'cancelled' WHERE payment_link_id = $1`,
          [link]
        )
        await pool.query('DELETE FROM payments.pagarme_payments WHERE payment_link_id = $1', [link])
        await pool.query('DELETE FROM payments.webhook_events WHERE provider_event_id = $1', [
          `pagarme:or_${stamp}:order.paid`,
        ])
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [orderId])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [priceId])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [productId])
        await pool.query('DELETE FROM payments.profiles WHERE id = $1', [userId])
      }
    },
    30_000
  )
})
