import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { closePool, getPool } from '@/lib/db/pool'

import { PostgresProductRepository } from './postgres-product.repository'

const here = dirname(fileURLToPath(import.meta.url))

function localDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL
  try {
    const envFile = readFileSync(join(here, '../../../../../deploy/postgres/.env'), 'utf8')
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

describe('repositório admin de produto', () => {
  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!databaseUrl)(
    'cria preço, recalcula estoque, recusa upgrade de outro produto e apaga os preços',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const repo = new PostgresProductRepository()
      const pool = getPool()
      const stamp = Date.now()
      const product = await repo.create({
        name: 'Admin',
        ref: `adm-${stamp}`,
        refund_policy: {
          title: 't',
          subtitle: 's',
          sections: [],
          footer: 'f',
          checkout: { buttonText: 'b', acceptanceText: 'a', acceptanceRequired: true },
        },
      })
      const other = await repo.create({ name: 'Outro', ref: `out-${stamp}` })
      await repo.createPrices(product.id, product.ref, [
        { ref: 'plano', amount: 1500, email_addon: {} },
      ])
      await repo.createPrices(other.id, other.ref, [{ ref: 'plano', amount: 900, email_addon: {} }])
      const loaded = await repo.findById(product.id)
      const otherLoaded = await repo.findById(other.id)
      const priceId = loaded?.prices?.[0]?.id
      const otherPriceId = otherLoaded?.prices?.[0]?.id
      expect(priceId).toBeTruthy()
      expect(otherPriceId).toBeTruthy()

      const profile = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Admin') RETURNING id`,
        [`adm-${stamp}@quitou.invalid`]
      )
      await pool.query(
        `INSERT INTO payments.orders (
           user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway
         ) VALUES ($1, $2, $3, 1500, 'paid', 'one_time', 'asaas')`,
        [profile.rows[0]!.id, product.id, priceId]
      )

      try {
        await pool.query('SELECT payments.recalc_stock_for_price($1)', [priceId])
        const stock = await pool.query<{ stock_sold: number }>(
          'SELECT stock_sold FROM payments.prices WHERE id = $1',
          [priceId]
        )
        expect(stock.rows[0]?.stock_sold).toBe(1)

        await expect(
          repo.updatePrices(product.id, [{ id: priceId!, upgrade_to_price_ids: [otherPriceId!] }])
        ).rejects.toThrow()

        await pool.query('DELETE FROM payments.orders WHERE user_id = $1', [profile.rows[0]!.id])
        await repo.delete(product.id)
        const gone = await pool.query('SELECT id FROM payments.prices WHERE product_id = $1', [
          product.id,
        ])
        expect(gone.rows).toHaveLength(0)
      } finally {
        await pool.query(`DELETE FROM payments.orders WHERE user_id = $1`, [profile.rows[0]!.id])
        await repo.delete(other.id).catch(() => undefined)
        await repo.delete(product.id).catch(() => undefined)
        await pool.query('DELETE FROM payments.profiles WHERE id = $1', [profile.rows[0]!.id])
      }
    },
    30_000
  )
})
