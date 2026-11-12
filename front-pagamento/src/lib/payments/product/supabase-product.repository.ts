import type { Database } from '@db/database.types'

import type { AppSupabaseClient } from '../types/supabase-client'
import type { ProductRepository } from './product.repository.interface'
import type {
  CreatePriceDTO,
  CreateProductDTO,
  DbProduct,
  DbProductInsert,
  DbProductUpdate,
  Price,
  PriceAddonOffer,
  PricePromoTierInput,
  PriceUpgradePath,
  Product,
  UpdatePriceDTO,
  UpdateProductDTO,
} from './product.types'

const PRODUCT_COLUMNS_SAFE =
  'id, ref, name, description, active, payment_methods, refund_policy, email_config, metadata, created_at, updated_at'

type DbPriceWithNested = Database['payments']['Tables']['prices']['Row'] & {
  price_promo_tiers?: Database['payments']['Tables']['price_promo_tiers']['Row'][] | null
  price_upgrade_paths?: Database['payments']['Tables']['price_upgrade_paths']['Row'][] | null
  price_addon_offers?:
    | (Database['payments']['Tables']['price_addon_offers']['Row'] & {
        addon?:
          | (Database['payments']['Tables']['prices']['Row'] & {
              products?: { name: string; description: string | null } | null
            })
          | null
      })[]
    | null
}

/**
 * Implementação Supabase do repositório de produtos
 */
export class SupabaseProductRepository implements ProductRepository {
  constructor(
    private supabase: AppSupabaseClient,
    /** true apenas com cliente service_role (admin server); anon/authenticated não têm SELECT em webhook_* */
    private readonly includeWebhookColumnsInSelect = false
  ) {}

  private productSelectWithPrices(): string {
    const cols = this.includeWebhookColumnsInSelect
      ? `${PRODUCT_COLUMNS_SAFE}, webhook_url, webhook_secret`
      : PRODUCT_COLUMNS_SAFE
    const priceNested = `prices(*, price_promo_tiers(*), price_upgrade_paths!from_price_id(id, from_price_id, to_price_id, sort_order, metadata, created_at), price_addon_offers!anchor_price_id(id, anchor_price_id, addon_price_id, sort_order, metadata, created_at, addon:prices!price_addon_offers_addon_price_id_fkey(id, ref, product_id, amount, currency, recurring, interval, interval_count, active, metadata, email_addon, stock_cap, stock_sold, products!prices_product_id_fkey(name, description))))`
    return `${cols}, ${priceNested}`
  }

  /**
   * PostgREST tipa .select(string) só para literais; string dinâmica vira GenericStringError.
   */
  private selectProductsWithPrices() {
    return this.productSelectWithPrices() as '*'
  }

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('products')
      .select(this.selectProductsWithPrices())
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null
      }
      throw error
    }

    return this.mapToProduct(data)
  }

  async findByRef(ref: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('products')
      .select(this.selectProductsWithPrices())
      .eq('ref', ref)
      .eq('active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return this.mapToProduct(data)
  }

  async findAll(options?: { active?: boolean }): Promise<Product[]> {
    let query = this.supabase
      .schema('payments')
      .from('products')
      .select(this.selectProductsWithPrices())
      .order('created_at', { ascending: false })

    if (options?.active !== undefined) {
      query = query.eq('active', options.active)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map((item: DbProduct & { prices?: DbPriceWithNested[] }) =>
      this.mapToProduct(item)
    )
  }

  async findByRefs(refs: string[], options?: { active?: boolean }): Promise<Product[]> {
    if (refs.length === 0) {
      return []
    }

    let query = this.supabase
      .schema('payments')
      .from('products')
      .select(this.selectProductsWithPrices())
      .in('ref', refs)
      .order('created_at', { ascending: false })

    if (options?.active !== undefined) {
      query = query.eq('active', options.active)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map((item: DbProduct & { prices?: DbPriceWithNested[] }) =>
      this.mapToProduct(item)
    )
  }

  async create(data: CreateProductDTO): Promise<Product> {
    const insertData: DbProductInsert = {
      name: data.name,
      ref: data.ref,
      description: data.description ?? null,
      active: data.active ?? true,
      payment_methods:
        (data.payment_methods as Database['payments']['Tables']['products']['Row']['payment_methods']) ||
        null,
      refund_policy: data.refund_policy || null,
      email_config: data.email_config || null,
      webhook_url: data.webhook_url ?? null,
      webhook_secret: data.webhook_secret ?? null,
      metadata: data.metadata || null,
    }

    const { data: product, error } = await this.supabase
      .schema('payments')
      .from('products')
      .insert(insertData)
      .select(this.selectProductsWithPrices())
      .single()

    if (error) {
      throw error
    }

    return this.mapToProduct(product)
  }

  async createPrices(
    productId: string,
    productRef: string,
    prices: CreatePriceDTO[]
  ): Promise<void> {
    if (prices.length === 0) return

    const inserts = prices.map((p) => {
      const ref = p.ref.startsWith(productRef) ? p.ref : `${productRef}-${p.ref}`
      return {
        ref,
        product_id: productId,
        amount: p.amount,
        currency: p.currency ?? 'BRL',
        recurring: p.recurring ?? false,
        interval: p.interval ?? null,
        interval_count: p.interval_count ?? null,
        active: p.active ?? true,
        metadata: p.metadata ?? {},
        email_addon: p.email_addon ?? {},
        stock_cap: p.stock_cap ?? null,
      }
    })

    const { data: insertedPrices, error } = await this.supabase
      .schema('payments')
      .from('prices')
      .insert(inserts)
      .select('id, ref')

    if (error) {
      throw error
    }

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i]
      const ref = p.ref.startsWith(productRef) ? p.ref : `${productRef}-${p.ref}`
      const row = insertedPrices?.find((r: { ref: string }) => r.ref === ref)
      if (!row?.id || !p.promo_tiers?.length) continue
      await this.syncPricePromoTiersForPrice(row.id, p.promo_tiers)
    }
  }

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const { prices: _prices, ...productData } = data
    const updateData: DbProductUpdate = {
      ...productData,
      updated_at: new Date().toISOString(),
    }

    const { data: product, error } = await this.supabase
      .schema('payments')
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(this.selectProductsWithPrices())
      .single()

    if (error) {
      throw error
    }

    return this.mapToProduct(product)
  }

  async updatePrices(productId: string, prices: UpdatePriceDTO[]): Promise<void> {
    if (prices.length === 0) return

    for (const p of prices) {
      const { upgrade_to_price_ids: _u, addon_price_ids: _a, ...priceFields } = p
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (priceFields.ref !== undefined) updatePayload.ref = priceFields.ref
      if (priceFields.amount !== undefined) updatePayload.amount = priceFields.amount
      if (priceFields.currency !== undefined) updatePayload.currency = priceFields.currency
      if (priceFields.recurring !== undefined) updatePayload.recurring = priceFields.recurring
      if (priceFields.interval !== undefined) updatePayload.interval = priceFields.interval
      if (priceFields.interval_count !== undefined)
        updatePayload.interval_count = priceFields.interval_count
      if (priceFields.active !== undefined) updatePayload.active = priceFields.active
      if (priceFields.metadata !== undefined) updatePayload.metadata = priceFields.metadata
      if (priceFields.email_addon !== undefined) updatePayload.email_addon = priceFields.email_addon
      if (priceFields.stock_cap !== undefined) updatePayload.stock_cap = priceFields.stock_cap

      const { error } = await this.supabase
        .schema('payments')
        .from('prices')
        .update(updatePayload)
        .eq('id', p.id)
        .eq('product_id', productId)

      if (error) throw error

      if (p.promo_tiers !== undefined) {
        await this.syncPricePromoTiersForPrice(p.id, p.promo_tiers)
      }
    }

    await this.syncPriceUpgradeAndAddonTables(productId, prices)
  }

  /**
   * Para cada preço listado no payload, substitui linhas em `price_upgrade_paths` e
   * `price_addon_offers` cujo from/anchor é esse preço (ids persistidos apenas).
   */
  private async syncPriceUpgradeAndAddonTables(
    productId: string,
    prices: UpdatePriceDTO[]
  ): Promise<void> {
    const { data: productPriceRows, error: listErr } = await this.supabase
      .schema('payments')
      .from('prices')
      .select('id')
      .eq('product_id', productId)

    if (listErr) throw listErr

    const productPriceIds = new Set((productPriceRows ?? []).map((r: { id: string }) => r.id))

    const payloadAnchorIds = prices
      .map((p) => p.id)
      .filter((id) => typeof id === 'string' && id.length > 0 && !id.startsWith('temp-'))

    if (payloadAnchorIds.length === 0) return

    const { error: delUp } = await this.supabase
      .schema('payments')
      .from('price_upgrade_paths')
      .delete()
      .in('from_price_id', payloadAnchorIds)

    if (delUp) throw delUp

    const { error: delAd } = await this.supabase
      .schema('payments')
      .from('price_addon_offers')
      .delete()
      .in('anchor_price_id', payloadAnchorIds)

    if (delAd) throw delAd

    const upgradeRows: {
      from_price_id: string
      to_price_id: string
      sort_order: number
    }[] = []

    const addonRows: {
      anchor_price_id: string
      addon_price_id: string
      sort_order: number
    }[] = []

    for (const p of prices) {
      if (!p.id || p.id.startsWith('temp-') || !productPriceIds.has(p.id)) continue

      const ups = p.upgrade_to_price_ids
      if (Array.isArray(ups)) {
        ups.forEach((toId, i) => {
          if (toId && toId !== p.id && productPriceIds.has(toId)) {
            upgradeRows.push({ from_price_id: p.id, to_price_id: toId, sort_order: i })
          }
        })
      }

      const adds = p.addon_price_ids
      if (Array.isArray(adds)) {
        adds.forEach((addonId, i) => {
          if (addonId && addonId !== p.id) {
            addonRows.push({ anchor_price_id: p.id, addon_price_id: addonId, sort_order: i })
          }
        })
      }
    }

    if (upgradeRows.length > 0) {
      const { error: insUp } = await this.supabase
        .schema('payments')
        .from('price_upgrade_paths')
        .insert(upgradeRows)
      if (insUp) throw insUp
    }

    if (addonRows.length > 0) {
      const { error: insAd } = await this.supabase
        .schema('payments')
        .from('price_addon_offers')
        .insert(addonRows)
      if (insAd) throw insAd
    }
  }

  private async syncPricePromoTiersForPrice(
    priceId: string,
    tiers: PricePromoTierInput[]
  ): Promise<void> {
    const { data: existingRows, error: exErr } = await this.supabase
      .schema('payments')
      .from('price_promo_tiers')
      .select('id')
      .eq('price_id', priceId)

    if (exErr) throw exErr

    const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id))
    const payloadIds = new Set(
      tiers.map((t) => t.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
    )

    const toDelete = [...existingIds].filter(
      (id): id is string => typeof id === 'string' && !payloadIds.has(id)
    )
    if (toDelete.length > 0) {
      const { error: delErr } = await this.supabase
        .schema('payments')
        .from('price_promo_tiers')
        .delete()
        .in('id', toDelete)
      if (delErr) throw delErr
    }

    const now = new Date().toISOString()
    for (const t of tiers) {
      const row = {
        price_id: priceId,
        sort_order: t.sort_order,
        discount_percent: t.discount_percent,
        ends_at: t.ends_at ?? null,
        max_units: t.max_units ?? null,
        applies_to: t.applies_to ?? 'both',
        updated_at: now,
      }
      if (t.id && existingIds.has(t.id)) {
        const { error: upErr } = await this.supabase
          .schema('payments')
          .from('price_promo_tiers')
          .update(row)
          .eq('id', t.id)
        if (upErr) throw upErr
      } else {
        const insertRow: Record<string, unknown> = {
          ...row,
          units_sold: 0,
        }
        if (t.id) insertRow.id = t.id
        const { error: insErr } = await this.supabase
          .schema('payments')
          .from('price_promo_tiers')
          .insert(insertRow)
        if (insErr) throw insErr
      }
    }
  }

  async delete(id: string): Promise<void> {
    const { error: pricesError } = await this.supabase
      .schema('payments')
      .from('prices')
      .delete()
      .eq('product_id', id)

    if (pricesError) throw pricesError

    const { error } = await this.supabase.schema('payments').from('products').delete().eq('id', id)

    if (error) throw error
  }

  async deletePrice(priceId: string): Promise<void> {
    const { error } = await this.supabase
      .schema('payments')
      .from('prices')
      .delete()
      .eq('id', priceId)

    if (error) throw error
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.findById(id)
    return product !== null
  }

  /**
   * Mapeia dados do banco para o tipo Product
   */
  private mapToProduct(
    data: DbProduct & {
      prices?: DbPriceWithNested[]
    }
  ): Product {
    const rawPrices = data.prices ?? []
    const priceById = new Map<string, Price>()

    const prices: Price[] = rawPrices.map((price) => {
      const p = this.mapPriceRowToPrice(price)
      priceById.set(p.id, p)
      return p
    })

    rawPrices.forEach((raw, index) => {
      const full = prices[index]
      if (!full) return

      const upgradeRows = [...(raw.price_upgrade_paths ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      )
      const addonRows = [...(raw.price_addon_offers ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      )

      const upgrade_paths: PriceUpgradePath[] = upgradeRows.map((row) => ({
        id: row.id,
        from_price_id: row.from_price_id,
        to_price_id: row.to_price_id,
        sort_order: row.sort_order,
        metadata: row.metadata ?? null,
        created_at: row.created_at,
        to_price: priceById.get(row.to_price_id) ?? null,
      }))

      const addon_offers: PriceAddonOffer[] = addonRows.map((row) => {
        const embedded = row.addon as
          | (Database['payments']['Tables']['prices']['Row'] & {
              products?: { name: string; description: string | null } | null
            })
          | null
          | undefined
        const fromCatalog = priceById.get(row.addon_price_id)
        let addon_price = fromCatalog ?? (embedded ? this.mapEmbeddedPriceRow(embedded) : null)
        if (addon_price && !addon_price.product && addon_price.product_id === data.id) {
          addon_price = {
            ...addon_price,
            product: { name: data.name, description: data.description },
          }
        }
        return {
          id: row.id,
          anchor_price_id: row.anchor_price_id,
          addon_price_id: row.addon_price_id,
          sort_order: row.sort_order,
          metadata: row.metadata ?? null,
          created_at: row.created_at,
          addon_price,
        }
      })

      if (upgrade_paths.length > 0) full.upgrade_paths = upgrade_paths
      if (addon_offers.length > 0) full.addon_offers = addon_offers
    })

    return {
      id: data.id,
      name: data.name,
      ref: data.ref,
      description: data.description,
      active: data.active ?? true,
      payment_methods: (data.payment_methods as string[]) || null,
      refund_policy: data.refund_policy || null,
      email_config: data.email_config || null,
      webhook_url: data.webhook_url ?? null,
      webhook_secret: data.webhook_secret ?? null,
      metadata: data.metadata || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      prices,
    }
  }

  private mapPriceRowToPrice(
    price: Database['payments']['Tables']['prices']['Row'] & {
      price_promo_tiers?: Database['payments']['Tables']['price_promo_tiers']['Row'][] | null
    }
  ): Price {
    return {
      id: price.id,
      ref: price.ref,
      product_id: price.product_id || '',
      amount: price.amount,
      currency: price.currency || 'BRL',
      recurring: price.recurring ?? false,
      interval: price.interval,
      interval_count: price.interval_count,
      active: price.active ?? true,
      metadata: price.metadata || null,
      email_addon: price.email_addon ?? null,
      stock_cap: price.stock_cap ?? null,
      stock_sold: price.stock_sold ?? 0,
      promo_tiers: (price.price_promo_tiers ?? []).map(
        (tier: Database['payments']['Tables']['price_promo_tiers']['Row']) => ({
          id: tier.id,
          price_id: tier.price_id,
          sort_order: tier.sort_order,
          discount_percent: tier.discount_percent,
          ends_at: tier.ends_at,
          max_units: tier.max_units,
          units_sold: tier.units_sold,
          applies_to:
            tier.applies_to === 'avista' || tier.applies_to === 'parcelado'
              ? tier.applies_to
              : 'both',
          created_at: tier.created_at,
          updated_at: tier.updated_at,
        })
      ),
      created_at: price.created_at,
      updated_at: price.updated_at,
    }
  }

  private mapEmbeddedPriceRow(
    row: Database['payments']['Tables']['prices']['Row'] & {
      products?: { name: string; description: string | null } | null
    }
  ): Price {
    return {
      id: row.id,
      ref: row.ref,
      product_id: row.product_id || '',
      amount: row.amount,
      currency: row.currency || 'BRL',
      recurring: row.recurring ?? false,
      interval: row.interval,
      interval_count: row.interval_count,
      active: row.active ?? true,
      metadata: row.metadata || null,
      email_addon: row.email_addon ?? null,
      stock_cap: row.stock_cap ?? null,
      stock_sold: row.stock_sold ?? 0,
      product: row.products
        ? { name: row.products.name, description: row.products.description }
        : null,
      promo_tiers: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
}
