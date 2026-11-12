import { isPublicHttpsWebhookUrl } from '@quitou/core/product-webhook'
import 'server-only'

import { getPool } from '@/lib/db/pool'
import { ValidationError } from '@/lib/errors/domain-errors'
import { findAdminProducts } from '@/lib/payments/catalog/postgres-catalog'
import { encryptStoredSecret } from '@/lib/security/secret-box'

import type { ProductRepository } from './product.repository.interface'
import type {
  CreatePriceDTO,
  CreateProductDTO,
  PricePromoTierInput,
  Product,
  UpdatePriceDTO,
  UpdateProductDTO,
} from './product.types'

function json(value: unknown): string | null {
  if (value == null) return null
  return JSON.stringify(value)
}

async function assertPublicWebhook(url: string | null | undefined) {
  if (!url) return
  if (await isPublicHttpsWebhookUrl(url)) return
  throw new ValidationError(
    'A URL de webhook precisa ser HTTPS e apontar para um host público.',
    'webhook_url'
  )
}

export class PostgresProductRepository implements ProductRepository {
  async findById(id: string): Promise<Product | null> {
    const [product] = await findAdminProducts('p.id = $2', [id])
    return product ?? null
  }

  async findByRef(ref: string): Promise<Product | null> {
    const [product] = await findAdminProducts('p.ref = $2', [ref])
    return product ?? null
  }

  async findAll(options?: { active?: boolean }): Promise<Product[]> {
    if (options?.active === undefined) {
      return findAdminProducts('TRUE ORDER BY p.created_at DESC', [])
    }
    return findAdminProducts('p.active = $2 ORDER BY p.created_at DESC', [options.active])
  }

  async findByRefs(refs: string[], options?: { active?: boolean }): Promise<Product[]> {
    if (refs.length === 0) return []
    if (options?.active === undefined) {
      return findAdminProducts('p.ref = ANY($2::text[])', [refs])
    }
    return findAdminProducts('p.ref = ANY($2::text[]) AND p.active = $3', [refs, options.active])
  }

  async create(data: CreateProductDTO): Promise<Product> {
    await assertPublicWebhook(data.webhook_url)
    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO payments.products (
         name, ref, description, active, payment_methods, refund_policy,
         email_config, webhook_url, webhook_secret, metadata
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb)
       RETURNING id`,
      [
        data.name,
        data.ref,
        data.description ?? null,
        data.active ?? true,
        json(data.payment_methods ?? null),
        json(data.refund_policy ?? null),
        json(data.email_config ?? null),
        data.webhook_url ?? null,
        encryptStoredSecret(data.webhook_secret) ?? null,
        json(data.metadata ?? {}),
      ]
    )
    const product = await this.findById(inserted.rows[0]!.id)
    if (!product) throw new Error('Produto criado não foi lido de volta')
    return product
  }

  async createPrices(
    productId: string,
    productRef: string,
    prices: CreatePriceDTO[]
  ): Promise<void> {
    for (const price of prices) {
      const ref = price.ref.startsWith(productRef) ? price.ref : `${productRef}-${price.ref}`
      const inserted = await getPool().query<{ id: string }>(
        `INSERT INTO payments.prices (
           ref, product_id, amount, currency, recurring, interval, interval_count,
           active, metadata, email_addon, stock_cap
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11)
         RETURNING id`,
        [
          ref,
          productId,
          price.amount,
          price.currency ?? 'BRL',
          price.recurring ?? false,
          price.interval ?? null,
          price.interval_count ?? null,
          price.active ?? true,
          json(price.metadata ?? {}),
          json(price.email_addon ?? {}),
          price.stock_cap ?? null,
        ]
      )
      if (price.promo_tiers?.length) {
        await this.syncPromoTiers(inserted.rows[0]!.id, price.promo_tiers)
      }
    }
  }

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    await assertPublicWebhook(data.webhook_url)
    const { prices: _prices, ...fields } = data
    const assignments: string[] = []
    const values: unknown[] = []
    const set = (column: string, value: unknown, asJson = false) => {
      values.push(asJson ? json(value) : value)
      assignments.push(`${column} = $${values.length}${asJson ? '::jsonb' : ''}`)
    }
    if (fields.name !== undefined) set('name', fields.name)
    if (fields.ref !== undefined) set('ref', fields.ref)
    if (fields.description !== undefined) set('description', fields.description)
    if (fields.active !== undefined) set('active', fields.active)
    if (fields.payment_methods !== undefined) set('payment_methods', fields.payment_methods, true)
    if (fields.refund_policy !== undefined) set('refund_policy', fields.refund_policy, true)
    if (fields.email_config !== undefined) set('email_config', fields.email_config, true)
    if (fields.webhook_url !== undefined) set('webhook_url', fields.webhook_url)
    if (
      fields.webhook_secret !== undefined &&
      fields.webhook_secret !== '••••••••' &&
      !fields.webhook_secret?.includes('…')
    ) {
      set('webhook_secret', encryptStoredSecret(fields.webhook_secret))
    }
    if (fields.metadata !== undefined) set('metadata', fields.metadata, true)
    if (assignments.length > 0) {
      values.push(id)
      await getPool().query(
        `UPDATE payments.products SET ${assignments.join(', ')} WHERE id = $${values.length}`,
        values
      )
    }
    const product = await this.findById(id)
    if (!product) throw new Error('Produto não encontrado')
    return product
  }

  async updatePrices(productId: string, prices: UpdatePriceDTO[]): Promise<void> {
    for (const price of prices) {
      const assignments: string[] = []
      const values: unknown[] = []
      const set = (column: string, value: unknown, asJson = false) => {
        values.push(asJson ? json(value) : value)
        assignments.push(`${column} = $${values.length}${asJson ? '::jsonb' : ''}`)
      }
      if (price.ref !== undefined) set('ref', price.ref)
      if (price.amount !== undefined) set('amount', price.amount)
      if (price.currency !== undefined) set('currency', price.currency)
      if (price.recurring !== undefined) set('recurring', price.recurring)
      if (price.interval !== undefined) set('interval', price.interval)
      if (price.interval_count !== undefined) set('interval_count', price.interval_count)
      if (price.active !== undefined) set('active', price.active)
      if (price.metadata !== undefined) set('metadata', price.metadata, true)
      if (price.email_addon !== undefined) set('email_addon', price.email_addon, true)
      if (price.stock_cap !== undefined) set('stock_cap', price.stock_cap)
      if (assignments.length > 0) {
        values.push(price.id, productId)
        await getPool().query(
          `UPDATE payments.prices SET ${assignments.join(', ')}
           WHERE id = $${values.length - 1} AND product_id = $${values.length}`,
          values
        )
      }
      if (price.promo_tiers !== undefined) {
        await this.syncPromoTiers(price.id, price.promo_tiers)
      }
    }
    await this.syncUpgradesAndAddons(productId, prices)
  }

  async delete(id: string): Promise<void> {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `DELETE FROM payments.price_promo_tiers
         WHERE price_id IN (SELECT id FROM payments.prices WHERE product_id = $1)`,
        [id]
      )
      await client.query(
        `DELETE FROM payments.price_upgrade_paths
         WHERE from_price_id IN (SELECT id FROM payments.prices WHERE product_id = $1)
            OR to_price_id IN (SELECT id FROM payments.prices WHERE product_id = $1)`,
        [id]
      )
      await client.query(
        `DELETE FROM payments.price_addon_offers
         WHERE anchor_price_id IN (SELECT id FROM payments.prices WHERE product_id = $1)
            OR addon_price_id IN (SELECT id FROM payments.prices WHERE product_id = $1)`,
        [id]
      )
      await client.query('DELETE FROM payments.prices WHERE product_id = $1', [id])
      await client.query('DELETE FROM payments.products WHERE id = $1', [id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async deletePrice(priceId: string): Promise<void> {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM payments.price_promo_tiers WHERE price_id = $1', [priceId])
      await client.query(
        `DELETE FROM payments.price_upgrade_paths
         WHERE from_price_id = $1 OR to_price_id = $1`,
        [priceId]
      )
      await client.query(
        `DELETE FROM payments.price_addon_offers
         WHERE anchor_price_id = $1 OR addon_price_id = $1`,
        [priceId]
      )
      await client.query('DELETE FROM payments.prices WHERE id = $1', [priceId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.findById(id)
    return product !== null
  }

  private async syncPromoTiers(priceId: string, tiers: PricePromoTierInput[]): Promise<void> {
    const existing = await getPool().query<{ id: string }>(
      'SELECT id FROM payments.price_promo_tiers WHERE price_id = $1',
      [priceId]
    )
    const existingIds = new Set(existing.rows.map((row) => row.id))
    const payloadIds = new Set(tiers.map((tier) => tier.id).filter((id): id is string => !!id))
    const toDelete = [...existingIds].filter((id) => !payloadIds.has(id))
    if (toDelete.length > 0) {
      await getPool().query('DELETE FROM payments.price_promo_tiers WHERE id = ANY($1::uuid[])', [
        toDelete,
      ])
    }
    for (const tier of tiers) {
      if (tier.id && existingIds.has(tier.id)) {
        await getPool().query(
          `UPDATE payments.price_promo_tiers
           SET sort_order = $2, discount_percent = $3, ends_at = $4, max_units = $5, applies_to = $6
           WHERE id = $1`,
          [
            tier.id,
            tier.sort_order,
            tier.discount_percent,
            tier.ends_at ?? null,
            tier.max_units ?? null,
            tier.applies_to ?? 'both',
          ]
        )
      } else {
        await getPool().query(
          `INSERT INTO payments.price_promo_tiers (
             id, price_id, sort_order, discount_percent, ends_at, max_units, units_sold, applies_to
           ) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, 0, $7)`,
          [
            tier.id ?? null,
            priceId,
            tier.sort_order,
            tier.discount_percent,
            tier.ends_at ?? null,
            tier.max_units ?? null,
            tier.applies_to ?? 'both',
          ]
        )
      }
    }
  }

  private async syncUpgradesAndAddons(productId: string, prices: UpdatePriceDTO[]): Promise<void> {
    const anchors = prices.map((price) => price.id).filter((id) => id && !id.startsWith('temp-'))
    if (anchors.length === 0) return
    await getPool().query(
      'DELETE FROM payments.price_upgrade_paths WHERE from_price_id = ANY($1::uuid[])',
      [anchors]
    )
    await getPool().query(
      'DELETE FROM payments.price_addon_offers WHERE anchor_price_id = ANY($1::uuid[])',
      [anchors]
    )
    for (const price of prices) {
      if (!price.id || price.id.startsWith('temp-')) continue
      for (const [index, toId] of (price.upgrade_to_price_ids ?? []).entries()) {
        if (!toId || toId === price.id) continue
        await getPool().query(
          `INSERT INTO payments.price_upgrade_paths (from_price_id, to_price_id, sort_order)
           VALUES ($1, $2, $3)`,
          [price.id, toId, index]
        )
      }
      for (const [index, addonId] of (price.addon_price_ids ?? []).entries()) {
        if (!addonId || addonId === price.id) continue
        await getPool().query(
          `INSERT INTO payments.price_addon_offers (anchor_price_id, addon_price_id, sort_order)
           VALUES ($1, $2, $3)`,
          [price.id, addonId, index]
        )
      }
    }
    void productId
  }
}
