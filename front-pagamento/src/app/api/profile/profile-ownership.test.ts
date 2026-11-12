import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { closePool, getPool } from '@/lib/db/pool'
import { listOwnOrders, readOwnProfile, updateOwnProfile } from '@/lib/profile/profile-store'

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

describe('posse do perfil', () => {
  afterAll(async () => {
    await closePool()
  })

  it('a página de perfil não importa o cliente Supabase', () => {
    const page = readFileSync(join(here, '../../profile/page.tsx'), 'utf8')
    const hook = readFileSync(join(here, '../../../hooks/use-profile.ts'), 'utf8')
    expect(page).not.toContain('supabase')
    expect(hook).not.toContain('@/supabase')
  })

  it.skipIf(!databaseUrl)(
    'o segundo usuário não lê nem altera o perfil e o pedido do primeiro',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const pool = getPool()
      const stamp = Date.now()
      const first = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name, phone) VALUES ($1, 'Ana Primeira', '11911111111') RETURNING id`,
        [`own-a-${stamp}@quitou.invalid`]
      )
      const second = await pool.query<{ id: string }>(
        `INSERT INTO payments.profiles (email, name) VALUES ($1, 'Bia Segunda') RETURNING id`,
        [`own-b-${stamp}@quitou.invalid`]
      )
      const firstId = first.rows[0]!.id
      const secondId = second.rows[0]!.id
      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name) VALUES ($1, 'Perfil') RETURNING id`,
        [`own-${stamp}`]
      )
      const price = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, email_addon)
         VALUES ($1, $2, 1000, '{}'::jsonb) RETURNING id`,
        [`own-${stamp}-p`, product.rows[0]!.id]
      )
      const order = await pool.query<{ id: string }>(
        `INSERT INTO payments.orders (
           user_id, product_id, price_id, amount_cents, status, order_type, payment_gateway
         ) VALUES ($1, $2, $3, 1000, 'paid', 'one_time', 'asaas') RETURNING id`,
        [firstId, product.rows[0]!.id, price.rows[0]!.id]
      )

      try {
        const own = await readOwnProfile(firstId)
        expect(own?.name).toBe('Ana Primeira')
        const changed = await updateOwnProfile(secondId, 'Bia Alterada', null)
        expect(changed?.id).toBe(secondId)
        const still = await readOwnProfile(firstId)
        expect(still?.name).toBe('Ana Primeira')

        const firstOrders = await listOwnOrders(firstId)
        const secondOrders = await listOwnOrders(secondId)
        expect(firstOrders.map((row) => row.id)).toEqual([order.rows[0]!.id])
        expect(secondOrders).toEqual([])
      } finally {
        await pool.query('DELETE FROM payments.orders WHERE id = $1', [order.rows[0]!.id])
        await pool.query('DELETE FROM payments.prices WHERE id = $1', [price.rows[0]!.id])
        await pool.query('DELETE FROM payments.products WHERE id = $1', [product.rows[0]!.id])
        await pool.query('DELETE FROM payments.profiles WHERE id = ANY($1::uuid[])', [
          [firstId, secondId],
        ])
      }
    },
    30_000
  )
})
