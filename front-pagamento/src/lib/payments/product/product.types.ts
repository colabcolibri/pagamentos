import type { Database, Json } from '@db/database.types'

/** Faixa de desconto do preço (promo até data e/ou N vendas). */
export interface PricePromoTier {
  id: string
  price_id: string
  sort_order: number
  discount_percent: number
  ends_at: string | null
  max_units: number | null
  units_sold: number
  applies_to: 'avista' | 'parcelado' | 'both'
  created_at: string | null
  updated_at: string | null
}

/**
 * Price relacionado a um produto
 */
export interface Price {
  id: string
  ref: string
  product_id: string
  amount: number
  currency: string
  recurring: boolean
  interval: string | null
  interval_count: number | null
  active: boolean
  metadata: Json | null
  /** Complemento de conteúdo dos emails (somado ao email_config do produto) */
  email_addon: Json | null
  /** Vagas totais; null = ilimitado. */
  stock_cap?: number | null
  /** Vendas pagas (somente leitura no admin; webhook incrementa). */
  stock_sold?: number
  /** Join opcional ao produto (ex.: preço add-on de outro catálogo). */
  product?: { name: string; description: string | null } | null
  promo_tiers?: PricePromoTier[]
  /** Caminhos de upgrade a partir deste preço (mesmo produto). */
  upgrade_paths?: PriceUpgradePath[]
  /** Ofertas add-on quando este preço é a âncora. */
  addon_offers?: PriceAddonOffer[]
  /**
   * Só formulário admin / PUT: substitui `price_upgrade_paths` ao salvar (mesmo produto).
   * Não vem preenchido do `mapToProduct`; use `upgrade_paths` na leitura.
   */
  upgrade_to_price_ids?: string[]
  /**
   * Só formulário admin / PUT: substitui `price_addon_offers` ao salvar.
   * Não vem do banco neste formato; use `addon_offers` na leitura.
   */
  addon_price_ids?: string[]
  created_at: string | null
  updated_at: string | null
}

/** Upgrade no mesmo produto: de um preço para outro. */
export interface PriceUpgradePath {
  id: string
  from_price_id: string
  to_price_id: string
  sort_order: number
  metadata: Json | null
  created_at: string | null
  /** Destino resolvido no catálogo do mesmo produto (promo tiers quando aplicável). */
  to_price?: Price | null
}

/** Upsell: oferta opcional ancorada em um preço (add-on pode ser de outro produto). */
export interface PriceAddonOffer {
  id: string
  anchor_price_id: string
  addon_price_id: string
  sort_order: number
  metadata: Json | null
  created_at: string | null
  /** Snapshot do preço add-on; se existir no mesmo produto, o repositório prefere a versão com promo tiers. */
  addon_price?: Price | null
}

/**
 * Produto completo com preços
 */
export interface Product {
  id: string
  name: string
  ref: string
  description: string | null
  active: boolean
  payment_methods: string[] | null
  refund_policy: Json | null
  email_config: Json | null
  webhook_url: string | null
  webhook_secret: string | null
  metadata: Json | null
  created_at: string | null
  updated_at: string | null
  prices?: Price[]
}

/**
 * Produto exposto em APIs públicas (sem credenciais de webhook)
 */
export type PublicProduct = Omit<Product, 'webhook_url' | 'webhook_secret'>

export function toPublicProduct(product: Product): PublicProduct {
  const { webhook_url: _w, webhook_secret: _s, ...rest } = product
  return rest
}

/**
 * DTO para criar preço
 */
export interface PricePromoTierInput {
  id?: string
  sort_order: number
  discount_percent: number
  ends_at?: string | null
  max_units?: number | null
  applies_to?: 'avista' | 'parcelado' | 'both'
}

export interface CreatePriceDTO {
  ref: string
  amount: number
  currency?: string
  recurring?: boolean
  interval?: string | null
  interval_count?: number | null
  active?: boolean
  metadata?: Json | null
  email_addon?: Json | null
  stock_cap?: number | null
  promo_tiers?: PricePromoTierInput[]
}

/**
 * DTO para atualizar preço (apenas preços existentes, por id)
 */
export interface UpdatePriceDTO {
  id: string
  ref?: string
  amount?: number
  currency?: string
  recurring?: boolean
  interval?: string | null
  interval_count?: number | null
  active?: boolean
  metadata?: Json | null
  email_addon?: Json | null
  stock_cap?: number | null
  /** Substituir faixas: omitir para não alterar; array (vazio ok) persiste o conjunto. */
  promo_tiers?: PricePromoTierInput[]
  /** Substitui caminhos de upgrade com `from_price_id` = este preço (mesmo produto). */
  upgrade_to_price_ids?: string[]
  /** Substitui add-ons com `anchor_price_id` = este preço. */
  addon_price_ids?: string[]
}

/**
 * DTO para criar produto
 */
export interface CreateProductDTO {
  name: string
  ref: string
  description?: string | null
  active?: boolean
  payment_methods?: string[]
  refund_policy?: Json | null
  email_config?: Json | null
  webhook_url?: string | null
  webhook_secret?: string | null
  metadata?: Json | null
  prices?: CreatePriceDTO[]
}

/**
 * DTO para atualizar produto
 */
export interface UpdateProductDTO {
  name?: string
  ref?: string
  description?: string | null
  active?: boolean
  payment_methods?: string[] | null
  refund_policy?: Json | null
  email_config?: Json | null
  webhook_url?: string | null
  webhook_secret?: string | null
  metadata?: Json | null
  prices?: UpdatePriceDTO[]
}

/**
 * Tipos do banco de dados
 */
export type DbProduct = Database['payments']['Tables']['products']['Row']
export type DbProductInsert = Database['payments']['Tables']['products']['Insert']
export type DbProductUpdate = Database['payments']['Tables']['products']['Update']
