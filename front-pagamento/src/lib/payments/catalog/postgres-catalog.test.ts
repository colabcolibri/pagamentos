import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { closePool, getPool } from '@/lib/db/pool'
import { previewCheckoutCoupon } from '@/lib/payments/coupon/preview-coupon'

import { findPublicProductByRef } from './postgres-catalog'

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

describe('catálogo público no postgres', () => {
  afterAll(async () => {
    await closePool()
  })

  it('a página de checkout não importa o cliente Supabase', () => {
    const page = readFileSync(join(here, '../../../app/checkout/[priceId]/page.tsx'), 'utf8')
    expect(page).not.toContain('@/supabase/client')
    expect(page).not.toContain('supabase.auth')
  })

  it.skipIf(!databaseUrl)(
    'esconde preço inativo e add-on de produto invisível, e calcula o cupom',
    async () => {
      process.env.DATABASE_URL = databaseUrl
      const stamp = Date.now()
      const productRef = `cat-${stamp}`
      const hiddenRef = `hid-${stamp}`
      const code = `CUPOM${stamp}`
      const pool = getPool()

      const product = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name, active) VALUES ($1, 'Catálogo', true) RETURNING id`,
        [productRef]
      )
      const hidden = await pool.query<{ id: string }>(
        `INSERT INTO payments.products (ref, name, active) VALUES ($1, 'Oculto', false) RETURNING id`,
        [hiddenRef]
      )
      const productId = product.rows[0]!.id
      const hiddenId = hidden.rows[0]!.id
      const visible = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, active, email_addon)
         VALUES ($1, $2, 10000, true, '{}'::jsonb) RETURNING id`,
        [`${productRef}-vis`, productId]
      )
      await pool.query(
        `INSERT INTO payments.prices (ref, product_id, amount, active, email_addon)
         VALUES ($1, $2, 5000, false, '{}'::jsonb)`,
        [`${productRef}-off`, productId]
      )
      const hiddenPrice = await pool.query<{ id: string }>(
        `INSERT INTO payments.prices (ref, product_id, amount, active, email_addon)
         VALUES ($1, $2, 3000, true, '{}'::jsonb) RETURNING id`,
        [`${hiddenRef}-addon`, hiddenId]
      )
      const priceId = visible.rows[0]!.id
      await pool.query(
        `INSERT INTO payments.price_addon_offers (anchor_price_id, addon_price_id, sort_order)
         VALUES ($1, $2, 0)`,
        [priceId, hiddenPrice.rows[0]!.id]
      )
      await pool.query(
        `INSERT INTO payments.discount_coupons (
           code, discount_type, discount_percent, applies_to, active,
           public_message_bands, public_show_remaining, public_show_valid_until
         ) VALUES ($1, 'percent', 10, 'both', true, '[]'::jsonb, false, false)`,
        [code]
      )

      try {
        const loaded = await findPublicProductByRef(productRef)
        expect(loaded?.prices?.map((price) => price.ref)).toEqual([`${productRef}-vis`])
        expect(loaded?.prices?.[0]?.addon_offers ?? []).toEqual([])
        expect(loaded?.webhook_secret).toBeNull()
        expect(await findPublicProductByRef(hiddenRef)).toBeNull()

        const preview = await previewCheckoutCoupon({
          priceId,
          flow: 'avista',
          couponCode: code.toLowerCase(),
          userId: '00000000-0000-4000-8000-000000000001',
          addonPriceIds: [],
        })
        expect(preview.ok).toBe(true)
        if (preview.ok) {
          expect(preview.body.final_cents).toBe(9000)
          expect(preview.body.normalized_code).toBe(code)
        }
      } finally {
        await pool.query('DELETE FROM payments.discount_coupons WHERE code = $1', [code])
        await pool.query('DELETE FROM payments.price_addon_offers WHERE anchor_price_id = $1', [
          priceId,
        ])
        await pool.query('DELETE FROM payments.prices WHERE product_id = ANY($1::uuid[])', [
          [productId, hiddenId],
        ])
        await pool.query('DELETE FROM payments.products WHERE id = ANY($1::uuid[])', [
          [productId, hiddenId],
        ])
      }
    }
  )
})
