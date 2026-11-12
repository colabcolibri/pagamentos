import {
  applyCouponDiscountToBase,
  cashBaseCentsFromList,
  type CheckoutCouponFlow,
} from '../pricing/checkout-pricing'

/** Faixa por quantidade de usos restantes: textos opcionais sobrescrevem o padrão do cupom quando o restante cai no intervalo. */
export type CouponPublicMessageBand = {
  remaining_min: number
  remaining_max: number | null
  remaining_prefix?: string | null
  remaining_suffix?: string | null
  /** Só nesta faixa: se true, exibe só `remaining_message_only` (sem número). */
  remaining_hide_number?: boolean | null
  remaining_message_only?: string | null
}

export type DiscountCouponRow = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed_cents'
  discount_percent: string | number | null
  discount_amount_cents: number | null
  applies_to: 'avista' | 'parcelado' | 'both'
  product_id: string | null
  price_id: string | null
  max_redemptions_total: number | null
  max_redemptions_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean | null
  description?: string | null
  public_show_remaining?: boolean | null
  public_remaining_prefix?: string | null
  public_remaining_suffix?: string | null
  public_show_valid_until?: boolean | null
  public_valid_until_prefix?: string | null
  public_valid_until_suffix?: string | null
  public_message_bands?: CouponPublicMessageBand[] | unknown | null
}

/** Linha retornada pelo select com junções de escopo. */
export type DiscountCouponRowWithScope = DiscountCouponRow & {
  discount_coupon_products?: { product_id: string }[] | null
  discount_coupon_prices?: { price_id: string }[] | null
}

/** @deprecated Use `DiscountCouponRowWithScope`. */
export type DiscountCouponRowWithProducts = DiscountCouponRowWithScope

/**
 * Restrição por produto = união de `discount_coupon_products` com `product_id` legado.
 * Sem nenhum dos dois = cupom global em relação a produto.
 */
export function couponAllowsProductId(coupon: DiscountCouponRowWithScope, productId: string): boolean {
  const fromJunction = (coupon.discount_coupon_products ?? []).map((r) => r.product_id)
  const fromLegacy = coupon.product_id ? [coupon.product_id] : []
  const allowed = new Set([...fromJunction, ...fromLegacy].filter(Boolean))
  if (allowed.size === 0) return true
  return allowed.has(productId)
}

/**
 * Restrição por preço = união de `discount_coupon_prices` com `price_id` legado.
 * Sem nenhum dos dois = cupom global em relação a preço (ainda sujeito a produto, se houver).
 */
export function couponAllowsPriceId(coupon: DiscountCouponRowWithScope, priceId: string): boolean {
  const fromJunction = (coupon.discount_coupon_prices ?? []).map((r) => r.price_id)
  const fromLegacy = coupon.price_id ? [coupon.price_id] : []
  const allowed = new Set([...fromJunction, ...fromLegacy].filter(Boolean))
  if (allowed.size === 0) return true
  return allowed.has(priceId)
}

export type ResolvedCheckoutCoupon = {
  couponId: string
  code: string
  appliesTo: 'avista' | 'parcelado' | 'both'
  flow: CheckoutCouponFlow
  listAmountCents: number
  cashDiscountPercent: number
  subtotalCents: number
  discountCents: number
  finalCents: number
  /** Linha completa para cálculos multi-modo (ex.: Pagar.me). */
  couponRow: DiscountCouponRow
  /** Frases opcionais para exibir no checkout (prefix + valor + suffix). */
  couponPublicLines: {
    remaining: string | null
    validUntil: string | null
  }
}

/**
 * Une prefixo + valor (número ou data) + sufixo, inserindo espaço entre as partes
 * quando não houver separação já implícita (espaço nas pontas ou pontuação colada).
 */
export function joinCouponPublicAffixes(
  prefix: string | null | undefined,
  middle: string | number,
  suffix: string | null | undefined
): string {
  const p = prefix ?? ''
  const s = suffix ?? ''
  const m = String(middle)

  const pEmpty = p.trim() === ''
  const sEmpty = s.trim() === ''

  let out = ''

  if (!pEmpty) {
    out = p
  }
  if (m) {
    if (out && !/\s$/.test(out) && !/^\s/.test(m)) {
      out += ' '
    }
    out += m
  }
  if (!sEmpty) {
    const firstNonSpace = s.trimStart()[0]
    const skipSpaceBeforeSuffix =
      !out ||
      !m ||
      /\s$/.test(out) ||
      /^\s/.test(s) ||
      (firstNonSpace !== undefined && /[.,!?;:)…]/.test(firstNonSpace))
    if (!skipSpaceBeforeSuffix) {
      out += ' '
    }
    out += s
  }

  return out
}

function phraseFromBandOrCoupon(
  band: CouponPublicMessageBand | null,
  key: keyof Pick<CouponPublicMessageBand, 'remaining_prefix' | 'remaining_suffix'>,
  couponVal: string | null | undefined
): string | null | undefined {
  if (!band) return couponVal
  const v = band[key]
  if (v !== undefined) return v
  return couponVal
}

function readBandInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

function parseBandBoundsFromRecord(o: Record<string, unknown>): { lo: number; hi: number | null } | null {
  const lo = readBandInt(o.remaining_min)
  if (lo === null || lo < 0) return null
  const hiRaw = o.remaining_max
  let hi: number | null = null
  if (hiRaw !== undefined && hiRaw !== null && hiRaw !== '') {
    const parsed = readBandInt(hiRaw)
    if (parsed === null || parsed < lo) return null
    hi = parsed
  }
  return { lo, hi }
}

function bandRecordContainsRemaining(o: Record<string, unknown>, remainingLeft: number): boolean {
  const b = parseBandBoundsFromRecord(o)
  if (!b) return false
  if (remainingLeft < b.lo) return false
  if (b.hi !== null && remainingLeft > b.hi) return false
  return true
}

/**
 * Índice (0-based) da primeira faixa no array cujo intervalo contém `remainingLeft`, ou null.
 */
export function indexOfActivePublicMessageBand(
  bands: unknown,
  remainingLeft: number | null
): number | null {
  if (remainingLeft == null || !Array.isArray(bands) || bands.length === 0) return null
  for (let i = 0; i < bands.length; i++) {
    const item = bands[i]
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (bandRecordContainsRemaining(o, remainingLeft)) return i
  }
  return null
}

/**
 * Primeira faixa cujo intervalo [remaining_min, remaining_max] contém `remainingLeft`
 * (remaining_max null = sem teto superior). Só faz sentido com limite total no cupom;
 * se `remainingLeft` for null, não há faixa ativa.
 * Ordem do array define prioridade em caso de sobreposição.
 */
export function resolveActivePublicMessageBand(
  bands: unknown,
  remainingLeft: number | null
): CouponPublicMessageBand | null {
  const i = indexOfActivePublicMessageBand(bands, remainingLeft)
  if (i == null) return null
  const item = (bands as unknown[])[i]
  const o = item as Record<string, unknown>
  const bounds = parseBandBoundsFromRecord(o)
  if (!bounds) return null
  return {
    remaining_min: bounds.lo,
    remaining_max: bounds.hi,
    remaining_prefix: readOptionalBandString(o.remaining_prefix),
    remaining_suffix: readOptionalBandString(o.remaining_suffix),
    remaining_hide_number: readOptionalBandBool(o.remaining_hide_number),
    remaining_message_only: readOptionalBandString(o.remaining_message_only),
  }
}

function readOptionalBandBool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined
  if (v === true || v === false) return v
  return undefined
}

function readOptionalBandString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'string') return v
  return undefined
}

/**
 * Monta textos públicos do cupom após validação (usos restantes e validade).
 * A faixa JSON ativa depende de quantos usos ainda restam (limite total − já usados).
 */
export function buildCouponPublicLines(
  coupon: DiscountCouponRow,
  usedRedemptionsTotal: number
): { remaining: string | null; validUntil: string | null } {
  const remainingLeft =
    coupon.max_redemptions_total != null
      ? Math.max(0, coupon.max_redemptions_total - usedRedemptionsTotal)
      : null
  const band = resolveActivePublicMessageBand(coupon.public_message_bands, remainingLeft)

  let remaining: string | null = null
  if (coupon.public_show_remaining && coupon.max_redemptions_total != null) {
    const left = remainingLeft ?? 0
    if (band?.remaining_hide_number === true) {
      const raw = band.remaining_message_only
      const phrase = raw != null && typeof raw === 'string' ? raw.trim() : ''
      remaining =
        phrase.length > 0
          ? phrase
          : joinCouponPublicAffixes(
              coupon.public_remaining_prefix,
              left,
              coupon.public_remaining_suffix
            )
    } else {
      remaining = joinCouponPublicAffixes(
        phraseFromBandOrCoupon(band, 'remaining_prefix', coupon.public_remaining_prefix),
        left,
        phraseFromBandOrCoupon(band, 'remaining_suffix', coupon.public_remaining_suffix)
      )
    }
  }

  let validUntil: string | null = null
  if (coupon.public_show_valid_until && coupon.ends_at) {
    const d = new Date(coupon.ends_at)
    if (!Number.isNaN(d.getTime())) {
      const formatted = d.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
      validUntil = joinCouponPublicAffixes(
        coupon.public_valid_until_prefix,
        formatted,
        coupon.public_valid_until_suffix
      )
    }
  }

  return { remaining, validUntil }
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function couponAppliesToFlow(
  appliesTo: 'avista' | 'parcelado' | 'both',
  flow: CheckoutCouponFlow
): boolean {
  if (appliesTo === 'both') return true
  return appliesTo === flow
}

async function countRedemptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('coupon_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', couponId)

  if (error) throw error
  return count ?? 0
}

async function countUserRedemptions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('coupon_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', couponId)
    .eq('user_id', userId)

  if (error) throw error
  return count ?? 0
}

/**
 * Aplica as regras do cupom já carregado. A contagem só entra quando o limite existe.
 */
export function evaluateLoadedCheckoutCoupon(
  couponFull: DiscountCouponRowWithScope | null,
  redemptions: { total: number; byUser: number },
  params: {
    productId: string
    priceId: string
    flow: CheckoutCouponFlow
    listAmountCents: number
    cashDiscountPercent: number
    catalogAmountCents?: number
  }
):
  | { ok: true; data: ResolvedCheckoutCoupon }
  | { ok: false; error: string } {
  if (!couponFull || !couponFull.active) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  const now = new Date()
  if (couponFull.starts_at && new Date(couponFull.starts_at) > now) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }
  if (couponFull.ends_at && new Date(couponFull.ends_at) < now) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  if (!couponAllowsProductId(couponFull, params.productId)) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  if (!couponAllowsPriceId(couponFull, params.priceId)) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  const {
    discount_coupon_products: _couponProducts,
    discount_coupon_prices: _couponPrices,
    ...coupon
  } = couponFull

  if (!couponAppliesToFlow(coupon.applies_to, params.flow)) {
    return { ok: false, error: 'Este cupom não é válido para a forma de pagamento selecionada.' }
  }

  const catalogCents = params.catalogAmountCents ?? params.listAmountCents
  const { discountCents, finalCents: afterCouponCents } = applyCouponDiscountToBase(catalogCents, coupon)
  const subtotalCents = Math.max(0, params.listAmountCents - (catalogCents - afterCouponCents))
  const cashDiscountCents =
    params.flow === 'avista' && params.cashDiscountPercent > 0
      ? Math.round(subtotalCents * params.cashDiscountPercent / 100)
      : 0
  const finalCents = subtotalCents > 0
    ? Math.max(1, subtotalCents - cashDiscountCents)
    : subtotalCents

  if (coupon.max_redemptions_total != null && redemptions.total >= coupon.max_redemptions_total) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  if (coupon.max_redemptions_per_user != null && redemptions.byUser >= coupon.max_redemptions_per_user) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  return {
    ok: true,
    data: {
      couponId: coupon.id,
      code: coupon.code,
      appliesTo: coupon.applies_to,
      flow: params.flow,
      listAmountCents: params.listAmountCents,
      cashDiscountPercent: params.cashDiscountPercent,
      subtotalCents,
      discountCents,
      finalCents,
      couponRow: coupon,
      couponPublicLines: buildCouponPublicLines(coupon, redemptions.total),
    },
  }
}

/**
 * Valida cupom no checkout (service role). Retorna dados para preço e metadata.
 */
export async function resolveCheckoutCoupon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: {
    couponCode: string
    userId: string
    productId: string
    priceId: string
    flow: CheckoutCouponFlow
    listAmountCents: number
    cashDiscountPercent: number
    /** Preço cheio do catálogo; cash discount aplica sobre este valor. Padrão: listAmountCents. */
    catalogAmountCents?: number
  }
): Promise<
  | { ok: true; data: ResolvedCheckoutCoupon }
  | { ok: false; error: string }
> {
  const code = normalizeCouponCode(params.couponCode)
  if (!code) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  const { data: row, error: fetchError } = await supabase
    .from('discount_coupons')
    .select(
      `
      *,
      discount_coupon_products ( product_id ),
      discount_coupon_prices ( price_id )
    `
    )
    .eq('code', code)
    .maybeSingle()

  if (fetchError) {
    return { ok: false, error: 'Cupom inválido ou não aplicável a esta forma de pagamento.' }
  }

  const couponFull = row as DiscountCouponRowWithScope | null
  const redemptions = { total: 0, byUser: 0 }
  if (couponFull?.max_redemptions_total != null) {
    redemptions.total = await countRedemptions(supabase, couponFull.id)
  }
  if (couponFull?.max_redemptions_per_user != null) {
    redemptions.byUser = await countUserRedemptions(supabase, couponFull.id, params.userId)
  }

  return evaluateLoadedCheckoutCoupon(couponFull, redemptions, params)
}

export async function recordCouponRedemption(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  couponId: string,
  orderId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('coupon_redemptions').insert({
    coupon_id: couponId,
    order_id: orderId,
    user_id: userId,
  })
  if (error) throw error
}
