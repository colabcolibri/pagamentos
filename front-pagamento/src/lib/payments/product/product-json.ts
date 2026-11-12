import type { Json } from '@db/database.types'

import type { CreatePriceDTO, CreateProductDTO, Price, Product } from './product.types'

/**
 * Formato exportado: produto completo com preços (para download/backup).
 */
export interface ProductExportJson {
  id: string
  name: string
  ref: string
  description: string | null
  active: boolean
  payment_methods: string[] | null
  refund_policy: unknown
  email_config: unknown
  metadata: unknown
  created_at: string | null
  updated_at: string | null
  prices?: Array<{
    id: string
    ref: string
    product_id: string
    amount: number
    currency: string
    recurring: boolean
    interval: string | null
    interval_count: number | null
    active: boolean
    metadata: unknown
    email_addon?: unknown
    created_at: string | null
    updated_at: string | null
  }>
}

/**
 * Gera JSON do produto (incluindo preços) para download.
 */
export function productToExportJson(product: Product): ProductExportJson {
  return {
    id: product.id,
    name: product.name,
    ref: product.ref,
    description: product.description ?? null,
    active: product.active,
    payment_methods: product.payment_methods ?? null,
    refund_policy: product.refund_policy ?? null,
    email_config: product.email_config ?? null,
    metadata: product.metadata ?? null,
    created_at: product.created_at ?? null,
    updated_at: product.updated_at ?? null,
    prices: product.prices?.map((p: Price) => ({
      id: p.id,
      ref: p.ref,
      product_id: p.product_id,
      amount: p.amount,
      currency: p.currency,
      recurring: p.recurring,
      interval: p.interval ?? null,
      interval_count: p.interval_count ?? null,
      active: p.active,
      metadata: p.metadata ?? null,
      email_addon: p.email_addon ?? null,
      created_at: p.created_at ?? null,
      updated_at: p.updated_at ?? null,
    })),
  }
}

/**
 * Baixa o JSON do produto como arquivo.
 */
export function downloadProductJson(product: Product, filename?: string): void {
  const json = productToExportJson(product)
  const blob = new Blob([JSON.stringify(json, null, 2)], {
    type: 'application/json',
  })
  const name = filename ?? `produto-${product.ref.replace(/[^a-z0-9-_]/gi, '-')}.json`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Objeto que pode vir no JSON de importação (com ou sem ids).
 */
interface ProductImportShape {
  id?: string
  name: string
  ref: string
  description?: string | null
  active?: boolean
  payment_methods?: string[] | null
  refund_policy?: unknown
  email_config?: unknown
  metadata?: unknown
  prices?: Array<{
    id?: string
    ref: string
    amount: number
    currency?: string
    recurring?: boolean
    interval?: string | null
    interval_count?: number | null
    active?: boolean
    metadata?: unknown
    email_addon?: unknown
  }>
}

/**
 * Converte JSON de importação para CreateProductDTO.
 * Remove ids (produto e preços) para que o backend gere novos UUIDs.
 * Ref duplicado é tratado no backend (prefixo aleatório).
 */
export function parseProductImportJson(json: string): CreateProductDTO {
  const raw = JSON.parse(json) as ProductImportShape

  if (!raw || typeof raw.name !== 'string' || typeof raw.ref !== 'string') {
    throw new Error('JSON inválido: deve ter "name" e "ref" no produto')
  }

  const product: CreateProductDTO = {
    name: raw.name.trim(),
    ref: raw.ref.trim(),
    description: raw.description ?? null,
    active: raw.active ?? true,
    payment_methods: Array.isArray(raw.payment_methods) ? raw.payment_methods : undefined,
    refund_policy: (raw.refund_policy ?? null) as Json | null,
    email_config: (raw.email_config ?? null) as Json | null,
    metadata: (raw.metadata ?? null) as Json | null,
  }

  if (Array.isArray(raw.prices) && raw.prices.length > 0) {
    product.prices = raw.prices.map((p) => {
      if (typeof p.ref !== 'string' || typeof p.amount !== 'number') {
        throw new Error('Cada preço no JSON deve ter "ref" e "amount"')
      }
      const dto: CreatePriceDTO = {
        ref: p.ref.trim(),
        amount: p.amount,
        currency: p.currency ?? 'BRL',
        recurring: p.recurring ?? false,
        interval: p.interval ?? null,
        interval_count: p.interval_count ?? null,
        active: p.active ?? true,
        metadata: (p.metadata ?? null) as Json | null,
        email_addon: (p.email_addon ?? null) as Json | null,
      }
      return dto
    })
  }

  return product
}

/** Chave em `product.metadata` só para organização da lista no admin (não afeta checkout). */
export const PRODUCT_ADMIN_GROUP_METADATA_KEY = 'admin_group' as const

export function getProductAdminGroupLabel(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const raw = (metadata as Record<string, unknown>)[PRODUCT_ADMIN_GROUP_METADATA_KEY]
  return typeof raw === 'string' ? raw.trim() : ''
}

/**
 * Preserva o restante do metadata e define ou remove o grupo do admin.
 */
export function mergeProductMetadataAdminGroup(
  existing: Json | null | undefined,
  adminGroupInput: string
): Json | null {
  const trimmed = adminGroupInput.trim()
  const base: Record<string, unknown> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
  if (trimmed) {
    base[PRODUCT_ADMIN_GROUP_METADATA_KEY] = trimmed
  } else {
    delete base[PRODUCT_ADMIN_GROUP_METADATA_KEY]
  }
  return Object.keys(base).length > 0 ? (base as Json) : null
}
