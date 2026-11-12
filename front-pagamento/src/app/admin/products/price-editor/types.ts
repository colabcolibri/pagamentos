import type { PriceEmailAddon } from '@quitou/core/email'

import type { PriceTopicSection } from '@/components/price-topics/types'

export interface PriceMetadata {
  title?: string
  cash_discount?: number
  max_installments?: number
  lifetime_access?: boolean
  access_months?: number
  success_message?: string
  /** Rótulo do limite no checkout (ex.: Vagas, Inscrições). Vazio = "Qtdes disponíveis". */
  checkout_stock_label?: string
  topics?: PriceTopicSection[]
  [key: string]: unknown
}

export interface PricePromoTierDraft {
  id?: string
  sort_order: number
  discount_percent: number
  ends_at?: string | null
  max_units?: number | null
  units_sold?: number
  applies_to?: 'avista' | 'parcelado' | 'both'
}

export interface Price {
  id: string
  ref: string
  amount: number
  currency: string
  recurring: boolean
  interval: string | null
  interval_count: number
  active: boolean
  metadata?: PriceMetadata | null
  email_addon?: PriceEmailAddon | null
  stock_cap?: number | null
  stock_sold?: number
  promo_tiers?: PricePromoTierDraft[]
  upgrade_to_price_ids?: string[]
  addon_price_ids?: string[]
}

export type CatalogPriceOption = { id: string; label: string }

export interface CatalogProductLite {
  id: string
  name: string
  prices?: Array<{
    id: string
    ref: string
    metadata?: PriceMetadata | null
  }>
}

export interface PricesEditorProps {
  prices: Price[]
  onChange: (prices: Price[]) => void
  productRef: string
  /** ID do produto no banco — necessário para salvar preços direto na API. */
  productId: string
  /** Lista de produtos (com preços) para montar opções de add-on em todo o catálogo. */
  catalogProducts: CatalogProductLite[]
}
