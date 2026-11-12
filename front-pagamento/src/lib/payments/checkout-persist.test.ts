import { findReusableAsaasPayment, insertOrderAndPayment } from '@quitou/core'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { closePool, getPool } from '@/lib/db/pool'
import { createCheckoutDatabase } from '@/lib/payments/checkout-database'

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

describe('checkout no postgres', () => {
  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!databaseUrl)(
    'não deixa pedido órfão quando o pagamento falha e reutiliza o pendente',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const database = createCheckoutDatabase()
      const stamp = Date.now()
      const profile = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Checkout') RETURNING id`,
        [`chk-${stamp}@quitou.invalid`]
      )
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name) VALUES ($1, 'Checkout') RETURNING id`,
        [`chk-${stamp}`]
      )
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, email_addon)
         VALUES ($1, $2, 2500, '{}'::jsonb) RETURNING id`,
        [`chk-${stamp}-p`, product.rows[0]!.id]
      )
      const profileId = profile.rows[0]!.id
      const productId = product.rows[0]!.id
      const priceId = price.rows[0]!.id
      const orderId = crypto.randomUUID()
      const paymentId = crypto.randomUUID()

      try {
        await expect(
          insertOrderAndPayment(
            database,
            'asaas_payments',
            {
              id: orderId,
              user_id: profileId,
              product_id: productId,
              price_id: priceId,
              order_type: 'one_time',
              status: 'pending',
              amount_cents: 2500,
              payment_gateway: 'asaas',
            },
            {
              id: paymentId,
              order_id: orderId,
              amount_cents: 2500,
              status: 'pending',
              billing_type: 'PIX',
              user_id: profileId,
              product_id: productId,
              price_id: priceId,
            }
          )
        ).rejects.toThrow()

        const orphan = await pool.query('SELECT id FROM payments.orders WHERE id = $1', [orderId])
        expect(orphan.rows).toEqual([])

        const savedOrder = crypto.randomUUID()
        const savedPayment = crypto.randomUUID()
        await insertOrderAndPayment(
          database,
          'asaas_payments',
          {
            id: savedOrder,
            user_id: profileId,
            product_id: productId,
            price_id: priceId,
            order_type: 'one_time',
            status: 'pending',
            amount_cents: 2500,
            payment_gateway: 'asaas',
            payment_method: 'spot',
          },
          {
            id: savedPayment,
            order_id: savedOrder,
            asaas_customer_id: 'checkout:test',
            amount_cents: 2500,
            status: 'pending',
            billing_type: 'PIX',
            user_id: profileId,
            product_id: productId,
            price_id: priceId,
            installments: 1,
            invoice_url: 'https://checkout.invalid/test',
          }
        )

        const again = await findReusableAsaasPayment(database, {
          userId: profileId,
          priceId,
          productId,
          billingType: 'PIX',
          installments: 1,
          createdAfter: new Date(Date.now() - 60_000).toISOString(),
        })
        expect(again?.id).toBe(savedPayment)
        const orders = await pool.query('SELECT id FROM payments.orders WHERE user_id = $1', [
          profileId,
        ])
        expect(orders.rows).toHaveLength(1)

        await pool.query(`UPDATE payments.asaas_payments SET status = 'cancelled' WHERE id = $1`, [
          savedPayment,
        ])
        await pool.query('DELETE FROM payments.asaas_payments WHERE id = $1', [savedPayment])
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [savedOrder])
      } finally {
        await pool.query(
          `UPDATE payments.asaas_payments SET status = 'cancelled' WHERE user_id = $1`,
          [profileId]
        )
        await pool.query('DELETE FROM payments.asaas_payments WHERE user_id = $1', [profileId])
        await pool.query('DELETE FROM payments.orders WHERE user_id = $1', [profileId])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [priceId])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [productId])
        await pool.query('DELETE FROM payments.profiles WHERE id = $1', [profileId])
      }
    },
    30_000
  )
})
