import { isPriceStockSoldOut } from './price-promo'
import type { CheckoutPriceRow } from './checkout-price-promo'

function sanitizeForCheckoutLine(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ResolvedCheckoutAddon = {
  id: string
  amountCents: number
  /** Sempre igual a `catalogCents` — preço cheio (catálogo), sem faixa no add-on. */
  listCents: number
  /** Preço de tabela (`amount`); entra na soma do cheio antes de cupom / à vista na cesta. */
  catalogCents: number
  nameForAsaas: string
  descriptionForAsaas: string
  externalReference: string
}

type PriceRowWithProduct = CheckoutPriceRow & {
  id: string
  ref: string
  recurring?: boolean | null
  metadata?: Record<string, unknown> | null
  products?: { name?: string | null } | { name?: string | null }[] | null
}

/**
 * Distribui um total em centavos proporcionalmente a pesos (ex.: listCents de cada linha).
 * A soma das partes é sempre igual a `totalFinal` (ajuste por maiores restos).
 */
export function allocateTotalCentsByWeights(
  totalFinal: number,
  parts: { key: string; weight: number }[]
): Record<string, number> {
  const safeTotal = Math.max(0, Math.round(totalFinal))
  const ws = parts.map((p) => ({ key: p.key, w: Math.max(0, p.weight) }))
  const sumW = ws.reduce((s, p) => s + p.w, 0)
  const out: Record<string, number> = {}
  if (ws.length === 0) return out
  if (sumW <= 0) {
    out[ws[0]!.key] = safeTotal
    for (let i = 1; i < ws.length; i++) out[ws[i]!.key] = 0
    return out
  }
  const raw = ws.map((p) => (safeTotal * p.w) / sumW)
  const floored = raw.map((x) => Math.floor(x))
  let rem = safeTotal - floored.reduce((a, b) => a + b, 0)
  const order = raw
    .map((x, i) => ({ i, f: x - Math.floor(x) }))
    .sort((a, b) => b.f - a.f)
  const add = [...floored]
  for (let k = 0; k < order.length && rem > 0; k++) {
    add[order[k]!.i] += 1
    rem -= 1
  }
  ws.forEach((p, i) => {
    out[p.key] = add[i] ?? 0
  })
  return out
}

/**
 * Valida add-ons já carregados. Cada add-on usa o preço cheio (`amount`).
 */
export function evaluateLoadedCheckoutAddons(params: {
  mainPriceRecurring: boolean
  requestedAddonPriceIds: string[]
  allowedAddonPriceIds: string[]
  prices: PriceRowWithProduct[]
}):
  | {
      ok: true
      addons: ResolvedCheckoutAddon[]
      totalAddonCents: number
      totalAddonListCents: number
      totalAddonCatalogCents: number
    }
  | { ok: false; error: string } {
  const unique = [...new Set(params.requestedAddonPriceIds.filter(Boolean))]
  if (unique.length === 0) {
    return {
      ok: true,
      addons: [],
      totalAddonCents: 0,
      totalAddonListCents: 0,
      totalAddonCatalogCents: 0,
    }
  }

  if (params.mainPriceRecurring) {
    return {
      ok: false,
      error: 'Add-ons não estão disponíveis para planos de assinatura neste checkout.',
    }
  }

  const allowed = new Set(params.allowedAddonPriceIds)
  for (const id of unique) {
    if (!allowed.has(id)) {
      return { ok: false, error: 'Um ou mais add-ons não estão disponíveis para este plano.' }
    }
  }

  if (params.prices.length !== unique.length) {
    return { ok: false, error: 'Não foi possível carregar os add-ons selecionados.' }
  }

  const byId = new Map<string, ResolvedCheckoutAddon>()

  for (const raw of params.prices) {
    if (raw.recurring) {
      return { ok: false, error: 'Add-ons recorrentes não são suportados.' }
    }

    const stockSoldOut = isPriceStockSoldOut({
      stock_cap: raw.stock_cap ?? null,
      stock_sold: raw.stock_sold ?? null,
    })
    if (stockSoldOut) {
      return { ok: false, error: 'Um dos add-ons selecionados está esgotado.' }
    }

    const catalogCents = typeof raw.amount === 'number' && raw.amount > 0 ? raw.amount : 0
    if (catalogCents <= 0) {
      return { ok: false, error: 'Um dos add-ons selecionados possui preço inválido.' }
    }
    const listCents = catalogCents
    const finalAddon = listCents

    const meta = (raw.metadata as Record<string, unknown>) || {}

    const prodRaw = raw.products
    const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw
    const productName = typeof prod?.name === 'string' ? prod.name.trim() : 'Item extra'
    const titleMeta = typeof meta.title === 'string' ? meta.title.trim() : ''
    const nameBase = titleMeta || raw.ref || productName
    const nameForAsaas = sanitizeForCheckoutLine(nameBase).substring(0, 30)
    const descRaw = titleMeta ? `${productName} — ${titleMeta}` : `${productName} — ${raw.ref}`
    const descriptionForAsaas = sanitizeForCheckoutLine(descRaw).substring(0, 150)

    byId.set(raw.id, {
      id: raw.id,
      amountCents: finalAddon,
      listCents,
      catalogCents,
      nameForAsaas: nameForAsaas || 'Extra',
      descriptionForAsaas: descriptionForAsaas || nameForAsaas,
      externalReference: raw.id,
    })
  }

  const ordered: ResolvedCheckoutAddon[] = []
  let totalAddonCents = 0
  let totalAddonListCents = 0
  let totalAddonCatalogCents = 0
  for (const id of unique) {
    const row = byId.get(id)
    if (!row) {
      return { ok: false, error: 'Não foi possível carregar os add-ons selecionados.' }
    }
    ordered.push(row)
    totalAddonCents += row.amountCents
    totalAddonListCents += row.listCents
    totalAddonCatalogCents += row.catalogCents
  }

  return {
    ok: true,
    addons: ordered,
    totalAddonCents,
    totalAddonListCents,
    totalAddonCatalogCents,
  }
}

/**
 * Valida add-ons contra `price_addon_offers`.
 * Cada add-on usa sempre o preço cheio (`amount`); sem faixa promocional no opcional — entra na soma com o plano e depois aplicam-se cupom e % à vista da cesta.
 */
export async function resolveCheckoutAddonsForAnchor(
  supabase: any,
  params: {
    anchorPriceId: string
    mainPriceRecurring: boolean
    requestedAddonPriceIds: string[]
    flow: 'avista' | 'parcelado'
  }
): Promise<
  | {
      ok: true
      addons: ResolvedCheckoutAddon[]
      totalAddonCents: number
      /** Soma dos preços cheios (`amount`) — mesma base que `totalAddonCatalogCents`. */
      totalAddonListCents: number
      /** Soma dos `amount` (catálogo) — base de cupom unificado junto ao plano. */
      totalAddonCatalogCents: number
    }
  | { ok: false; error: string }
> {
  const unique = [...new Set(params.requestedAddonPriceIds.filter(Boolean))]
  if (unique.length === 0) {
    return evaluateLoadedCheckoutAddons({
      mainPriceRecurring: params.mainPriceRecurring,
      requestedAddonPriceIds: [],
      allowedAddonPriceIds: [],
      prices: [],
    })
  }

  const { data: offerRows, error: offerErr } = await supabase
    .schema('payments')
    .from('price_addon_offers')
    .select('addon_price_id')
    .eq('anchor_price_id', params.anchorPriceId)

  if (offerErr) {
    return { ok: false, error: 'Erro ao validar add-ons.' }
  }

  const { data: priceRows, error: priceErr } = await supabase
    .schema('payments')
    .from('prices')
    .select('id, ref, amount, metadata, recurring, stock_cap, stock_sold, products (name)')
    .in('id', unique)
    .eq('active', true)

  if (priceErr || !Array.isArray(priceRows)) {
    return { ok: false, error: 'Não foi possível carregar os add-ons selecionados.' }
  }

  return evaluateLoadedCheckoutAddons({
    mainPriceRecurring: params.mainPriceRecurring,
    requestedAddonPriceIds: params.requestedAddonPriceIds,
    allowedAddonPriceIds: (
      (offerRows as { addon_price_id: string }[] | null | undefined) ?? []
    ).map((row) => row.addon_price_id),
    prices: priceRows as PriceRowWithProduct[],
  })
}
