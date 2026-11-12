import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { closePool, getPool } from '@/lib/db/pool'
import { readOwnPaymentConfirmation, readOwnPaymentStatus } from '@/lib/payments/payment-read'

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

describe('posse do pagamento', () => {
  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!databaseUrl)(
    'o segundo cliente não lê status nem confirmação do primeiro',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const stamp = Date.now()
      const first = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Dono') RETURNING id`,
        [`pay-a-${stamp}@quitou.invalid`]
      )
      const second = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Outro') RETURNING id`,
        [`pay-b-${stamp}@quitou.invalid`]
      )
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name) VALUES ($1, 'Status') RETURNING id`,
        [`pay-${stamp}`]
      )
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, email_addon)
         VALUES ($1, $2, 1500, '{}'::jsonb) RETURNING id`,
        [`pay-${stamp}-p`, product.rows[0]!.id]
      )
      const order = await pool.query<{ id: string }>(
        `INSERT INTO payments.orders (
           user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway
         ) VALUES ($1, $2, $3, 1500, 'pending', 'one_time', 'asaas') RETURNING id`,
        [first.rows[0]!.id, product.rows[0]!.id, price.rows[0]!.id]
      )
      const payment = await pool.query<{ id: string }>(
        `INSERT INTO payments.asaas_payments (
           order_id, asaas_customer_id, amount_cents, status, billing_type,
           user_id, product_id, price_id, installments, invoice_url, pix_code
         ) VALUES ($1, 'checkout:status', 1500, 'pending', 'PIX', $2, $3, $4, 1, 'https://checkout.invalid/s', 'copia-e-cola')
         RETURNING id`,
        [order.rows[0]!.id, first.rows[0]!.id, product.rows[0]!.id, price.rows[0]!.id]
      )
      const paymentId = payment.rows[0]!.id
      try {
        const own = await readOwnPaymentStatus(first.rows[0]!.id, paymentId, 'asaas')
        expect(own?.pix_code).toBe('copia-e-cola')
        expect(own?.invoice_url).toBe('https://checkout.invalid/s')
        expect(await readOwnPaymentStatus(second.rows[0]!.id, paymentId, 'asaas')).toBeNull()
        const confirmation = await readOwnPaymentConfirmation(first.rows[0]!.id, paymentId, 'asaas')
        expect(confirmation?.product_name).toBe('Status')
        expect(await readOwnPaymentConfirmation(second.rows[0]!.id, paymentId, 'asaas')).toBeNull()
      } finally {
        await pool.query(`UPDATE payments.asaas_payments SET status = 'cancelled' WHERE id = $1`, [
          paymentId,
        ])
        await pool.query('DELETE FROM payments.asaas_payments WHERE id = $1', [paymentId])
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [order.rows[0]!.id])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [price.rows[0]!.id])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [product.rows[0]!.id])
        await pool.query('DELETE FROM payments.profiles WHERE id = ANY($1::uuid[])', [
          [first.rows[0]!.id, second.rows[0]!.id],
        ])
      }
    },
    30_000
  )
})
