/**
 * Promoção por preço: primeira faixa elegível (sort_order) aplica % sobre o preço cheio.
 * Cada faixa pode valer só à vista, só parcelado ou ambos (`applies_to`).
 */

import { cashBaseCentsFromList } from './checkout-pricing'

export type PricePromoCheckoutFlow = 'avista' | 'parcelado'

export type PromoAppliesTo = 'avista' | 'parcelado' | 'both'

export type PricePromoTierRow = {
  id: string
  sort_order: number
  discount_percent: number
  ends_at: string | null
  max_units: number | null
  units_sold: number
  /** Default conceitual `both` quando ausente (dados antigos). */
  applies_to?: PromoAppliesTo | null
}

export function normalizePromoAppliesTo(raw: string | null | undefined): PromoAppliesTo {
  if (raw === 'avista' || raw === 'parcelado' || raw === 'both') return raw
  return 'both'
}

export function tierMatchesCheckoutFlow(
  tier: Pick<PricePromoTierRow, 'applies_to'>,
  flow: PricePromoCheckoutFlow
): boolean {
  const a = normalizePromoAppliesTo(tier.applies_to ?? undefined)
  if (a === 'both') return true
  return a === flow
}

export type ResolvedPricePromo = {
  promoListCents: number
  tierId: string | null
  discountPercentApplied: number
  endsAt: string | null
  maxUnits: number | null
  unitsSold: number
  appliesTo: PromoAppliesTo | null
}

const emptyResolve = (catalog: number): ResolvedPricePromo => ({
  promoListCents: catalog,
  tierId: null,
  discountPercentApplied: 0,
  endsAt: null,
  maxUnits: null,
  unitsSold: 0,
  appliesTo: null,
})

export function resolveActivePricePromo(
  listCents: number,
  tiers: PricePromoTierRow[] | null | undefined,
  now: Date = new Date(),
  flow: PricePromoCheckoutFlow = 'avista'
): ResolvedPricePromo {
  const sorted = [...(tiers ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  for (const t of sorted) {
    if (!tierMatchesCheckoutFlow(t, flow)) continue
    if (t.discount_percent <= 0) continue
    const ended = t.ends_at != null && t.ends_at !== '' && new Date(t.ends_at) <= now
    const soldOut = t.max_units != null && t.units_sold >= t.max_units
    if (ended || soldOut) continue
    const promoListCents = Math.round(listCents * (1 - t.discount_percent / 100))
    return {
      promoListCents,
      tierId: t.id,
      discountPercentApplied: t.discount_percent,
      endsAt: t.ends_at,
      maxUnits: t.max_units,
      unitsSold: t.units_sold,
      appliesTo: normalizePromoAppliesTo(t.applies_to ?? undefined),
    }
  }
  return emptyResolve(listCents)
}

export type PriceStockRow = {
  stock_cap: number | null
  stock_sold: number | null
}

export function isPriceStockSoldOut(price: PriceStockRow): boolean {
  const cap = price.stock_cap
  if (cap == null || cap <= 0) return false
  const sold = Number(price.stock_sold ?? 0)
  return sold >= cap
}

export function priceStockRemaining(price: PriceStockRow): number | null {
  const cap = price.stock_cap
  if (cap == null || cap <= 0) return null
  const sold = Number(price.stock_sold ?? 0)
  return Math.max(0, cap - sold)
}

export function buildPricePromoOrderMetadata(input: {
  catalogListCents: number
  promo: ResolvedPricePromo
}): Record<string, unknown> {
  const { catalogListCents, promo } = input
  return {
    price_catalog_list_cents: catalogListCents,
    price_promo_list_cents: promo.promoListCents,
    price_promo_tier_id: promo.tierId,
    price_promo_discount_percent: promo.discountPercentApplied,
    price_promo_applies_to: promo.appliesTo,
    price_promo_ends_at: promo.endsAt,
  }
}

/** Fatia por fluxo para UI pública (checkout, vitrine). */
export type PricePromoFlowSlice = {
  catalogListCents: number
  promoListCents: number
  hasPromo: boolean
  /** % da faixa de pricing (badge). */
  discountPercent: number
  /**
   * % adicional à vista (`metadata.cash_discount`), só no fluxo à vista;
   * aplica depois do desconto da faixa (sobre o valor já promocional).
   */
  cashDiscountPercent?: number
  /**
   * Valor após a faixa de oferta, antes do desconto à vista (PIX/boleto).
   * Só no fluxo à vista; igual a `promoListCents` quando não há `cash_discount`.
   */
  afterPromoTierCents?: number
  endsAt: string | null
  maxUnits: number | null
  unitsSold: number
  appliesTo: PromoAppliesTo | null
}

export type PricePromoPublicDisplay = {
  catalogListCents: number
  stock: {
    cap: number | null
    sold: number
    remaining: number | null
    soldOut: boolean
  }
  avista: PricePromoFlowSlice
  parcelado: PricePromoFlowSlice
  /** Parcelas máximas no cartão (`metadata.max_installments`), alinhado ao checkout. */
  maxInstallments: number
}

/** Entrada solta (API/admin) antes de normalizar `applies_to`. */
export type PricePromoTierInputLike = Omit<PricePromoTierRow, 'applies_to'> & {
  applies_to?: string | null
}

function toFlowSlice(catalog: number, r: ResolvedPricePromo): PricePromoFlowSlice {
  const promoListCents = r.promoListCents
  return {
    catalogListCents: catalog,
    promoListCents,
    hasPromo: promoListCents < catalog,
    discountPercent: r.discountPercentApplied,
    endsAt: r.endsAt,
    maxUnits: r.maxUnits,
    unitsSold: r.unitsSold,
    appliesTo: r.appliesTo,
  }
}

function clampCashDiscountPercent(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, raw))
  }
  if (typeof raw === 'string') {
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
  }
  return 0
}

/**
 * À vista: tier e cupom aplicam sobre o preço cheio (catalog); após isso,
 * o desconto à vista aplica sobre o subtotal resultante.
 * afterPromoTierCents = catalog − tier (subtotal após tier, base para o cash).
 */
function toAvistaFlowSlice(
  catalog: number,
  r: ResolvedPricePromo,
  cashDiscountPercent: number
): PricePromoFlowSlice {
  const afterTier = r.promoListCents // catalog − tier%
  const cashPct = clampCashDiscountPercent(cashDiscountPercent)
  // cash aplica sobre o subtotal (afterTier), não sobre o catalog
  const cashDiscountCents = cashPct > 0 ? Math.round(afterTier * cashPct / 100) : 0
  const finalCents = afterTier > 0 ? Math.max(1, afterTier - cashDiscountCents) : 0
  return {
    catalogListCents: catalog,
    promoListCents: finalCents,
    hasPromo: finalCents < catalog,
    discountPercent: r.discountPercentApplied,
    cashDiscountPercent: cashPct > 0 ? cashPct : undefined,
    afterPromoTierCents: afterTier,
    endsAt: r.endsAt,
    maxUnits: r.maxUnits,
    unitsSold: r.unitsSold,
    appliesTo: r.appliesTo,
  }
}

export function buildPricePromoPublicDisplay(input: {
  amount: number
  stock_cap?: number | null
  stock_sold?: number | null
  price_promo_tiers?: PricePromoTierInputLike[] | null
  /** `metadata.cash_discount` do preço — aplica só na fatia à vista, após o tier. */
  cashDiscountPercent?: number | null
  /** `metadata.max_installments` já normalizado (ex.: `parseMaxInstallmentsFromMetadata`). */
  maxInstallments?: number | null
  now?: Date
}): PricePromoPublicDisplay {
  const now = input.now ?? new Date()
  const catalog = input.amount
  const tiers: PricePromoTierRow[] | null =
    input.price_promo_tiers?.map((t) => ({
      id: t.id,
      sort_order: t.sort_order,
      discount_percent: t.discount_percent,
      ends_at: t.ends_at,
      max_units: t.max_units,
      units_sold: t.units_sold,
      applies_to: normalizePromoAppliesTo(t.applies_to ?? undefined),
    })) ?? null
  const stockRow: PriceStockRow = {
    stock_cap: input.stock_cap ?? null,
    stock_sold: input.stock_sold ?? null,
  }
  const remaining = priceStockRemaining(stockRow)
  const avistaResolved = resolveActivePricePromo(catalog, tiers, now, 'avista')
  const parcelado = resolveActivePricePromo(catalog, tiers, now, 'parcelado')
  const cashPct = clampCashDiscountPercent(input.cashDiscountPercent ?? 0)
  const maxInstRaw = input.maxInstallments
  const maxInstallments =
    typeof maxInstRaw === 'number' && Number.isFinite(maxInstRaw) && maxInstRaw >= 1
      ? Math.min(Math.floor(maxInstRaw), 48)
      : 1
  return {
    catalogListCents: catalog,
    stock: {
      cap: stockRow.stock_cap,
      sold: Number(stockRow.stock_sold ?? 0),
      remaining,
      soldOut: isPriceStockSoldOut(stockRow),
    },
    avista: toAvistaFlowSlice(catalog, avistaResolved, cashPct),
    parcelado: toFlowSlice(catalog, parcelado),
    maxInstallments,
  }
}
