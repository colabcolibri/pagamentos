import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { closePool, getPool } from '@/lib/db/pool'

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

describe('operação admin no postgres', () => {
  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!databaseUrl)(
    'marca o pedido como pago e recusa apagar pagamento pendente',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const stamp = Date.now()
      const profile = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Admin') RETURNING id`,
        [`ops-${stamp}@quitou.invalid`]
      )
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name) VALUES ($1, 'Ops') RETURNING id`,
        [`ops-${stamp}`]
      )
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, email_addon)
         VALUES ($1, $2, 800, '{}'::jsonb) RETURNING id`,
        [`ops-${stamp}-p`, product.rows[0]!.id]
      )
      const order = await pool.query<{ id: string }>(
        `INSERT INTO payments.orders (
           user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway, payment_method
         ) VALUES ($1, $2, $3, 800, 'pending', 'one_time', 'asaas', 'pix') RETURNING id`,
        [profile.rows[0]!.id, product.rows[0]!.id, price.rows[0]!.id]
      )
      const payment = await pool.query<{ id: string }>(
        `INSERT INTO payments.asaas_payments (
           order_id, asaas_customer_id, amount_cents, status, billing_type, user_id, product_id, price_id
         ) VALUES ($1, 'checkout:ops', 800, 'pending', 'PIX', $2, $3, $4) RETURNING id`,
        [order.rows[0]!.id, profile.rows[0]!.id, product.rows[0]!.id, price.rows[0]!.id]
      )
      const orderId = order.rows[0]!.id
      const paymentId = payment.rows[0]!.id
      try {
        await pool.query(
          `UPDATE payments.orders SET status = 'paid', paid_at = now() WHERE id = $1`,
          [orderId]
        )
        const paid = await pool.query<{ status: string }>(
          'SELECT status FROM payments.orders WHERE id = $1',
          [orderId]
        )
        expect(paid.rows[0]?.status).toBe('paid')

        const client = createAdminPaymentsClient()
        const removed = await client
          .schema('payments')
          .from('asaas_payments')
          .delete()
          .eq('id', paymentId)
        expect(removed.error?.message).toMatch(/cancelled|PROIBIDO|cancel/i)
      } finally {
        await pool.query(`UPDATE payments.asaas_payments SET status = 'cancelled' WHERE id = $1`, [
          paymentId,
        ])
        await pool.query('DELETE FROM payments.asaas_payments WHERE id = $1', [paymentId])
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [orderId])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [price.rows[0]!.id])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [product.rows[0]!.id])
        await pool.query('DELETE FROM payments.profiles WHERE id = $1', [profile.rows[0]!.id])
      }
    },
    30_000
  )
})
