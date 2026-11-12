/**
 * Funções de API e parsing para preview de cupom no checkout.
 * Responsabilidade única: comunicação com a API de cupom e parsing da resposta.
 */
import type {
  CheckoutPromoCouponFlowBreakdown,
  CheckoutPromoCouponOverlay,
} from './checkout-price-steps'

export type CouponPreviewPayload = {
  ok: true
  normalized_code: string
  applies_to: string
  subtotal_cents: number
  discount_cents: number
  final_cents: number
  discount_type: 'percent' | 'fixed_cents'
  discount_percent_value: number | null
  discount_fixed_amount_cents: number | null
  public_remaining_line: string | null
  public_valid_until_line: string | null
}

export function parseCouponPublicLines(data: Record<string, unknown>): {
  remaining: string | null
  validUntil: string | null
} {
  const raw = data.coupon_public_lines
  if (!raw || typeof raw !== 'object') {
    return { remaining: null, validUntil: null }
  }
  const o = raw as Record<string, unknown>
  return {
    remaining: typeof o.remaining === 'string' ? o.remaining : null,
    validUntil: typeof o.valid_until === 'string' ? o.valid_until : null,
  }
}

export function breakdownFromPreviewData(
  data: Record<string, unknown>
): CheckoutPromoCouponFlowBreakdown {
  return {
    subtotalCents: Number(data.subtotal_cents),
    discountCents: Number(data.discount_cents),
    finalCents: Number(data.final_cents),
  }
}

export function parseDiscountConfigFromPreviewData(data: Record<string, unknown>): {
  discount_type: 'percent' | 'fixed_cents'
  discount_percent_value: number | null
  discount_fixed_amount_cents: number | null
} {
  const dt = data.discount_type
  if (dt === 'fixed_cents') {
    const raw = data.discount_amount_cents
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
    return {
      discount_type: 'fixed_cents',
      discount_percent_value: null,
      discount_fixed_amount_cents: Number.isFinite(n) ? n : null,
    }
  }
  const rawP = data.discount_percent
  const p = typeof rawP === 'number' ? rawP : typeof rawP === 'string' ? parseFloat(rawP) : NaN
  const rounded = Number.isFinite(p) && p > 0 ? Math.round(p * 10000) / 10000 : null
  return {
    discount_type: 'percent',
    discount_percent_value: rounded,
    discount_fixed_amount_cents: null,
  }
}

export async function postCouponPreviewRequest(
  priceId: string,
  flow: 'avista' | 'parcelado',
  couponCode: string,
  addonPriceIds?: string[]
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const body: Record<string, unknown> = {
    price_id: priceId,
    checkout_flow: flow,
    coupon_code: couponCode,
  }
  if (addonPriceIds && addonPriceIds.length > 0) {
    body.addon_price_ids = addonPriceIds
  }
  const res = await fetch('/api/payments/coupon/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === 'string' ? data.error : 'Cupom inválido ou não aplicável.',
    }
  }
  return { ok: true, data }
}

export async function resolveCouponPreviewAndOverlay(
  priceId: string,
  checkoutFlow: 'avista' | 'parcelado',
  rawCode: string,
  addonPriceIds?: string[]
): Promise<
  | { ok: false; error: string }
  | {
      ok: true
      preview: CouponPreviewPayload
      overlay: CheckoutPromoCouponOverlay
      normalizedCode: string | null
    }
> {
  const r1 = await postCouponPreviewRequest(priceId, checkoutFlow, rawCode, addonPriceIds)
  if (!r1.ok) {
    return { ok: false, error: r1.error }
  }

  const d1 = r1.data
  const appliesRaw = String(d1.applies_to ?? '')
  if (appliesRaw !== 'avista' && appliesRaw !== 'parcelado' && appliesRaw !== 'both') {
    return { ok: false, error: 'Cupom inválido ou não aplicável.' }
  }
  const appliesTo = appliesRaw as CheckoutPromoCouponOverlay['appliesTo']

  let overlay: CheckoutPromoCouponOverlay

  const discountCfg = parseDiscountConfigFromPreviewData(d1)
  const normalizedCode =
    typeof d1.normalized_code === 'string' && d1.normalized_code.trim()
      ? String(d1.normalized_code).trim()
      : null
  const resolvedCode = normalizedCode ?? rawCode.toUpperCase()
  const overlayMeta = {
    code: resolvedCode,
    discountPercent: discountCfg.discount_percent_value ?? null,
  }

  if (appliesTo === 'both') {
    const otherFlow = checkoutFlow === 'avista' ? 'parcelado' : 'avista'
    const r2 = await postCouponPreviewRequest(priceId, otherFlow, rawCode, addonPriceIds)
    if (!r2.ok) {
      return { ok: false, error: r2.error }
    }
    const d2 = r2.data
    overlay = {
      appliesTo: 'both',
      avista:
        checkoutFlow === 'avista' ? breakdownFromPreviewData(d1) : breakdownFromPreviewData(d2),
      parcelado:
        checkoutFlow === 'avista' ? breakdownFromPreviewData(d2) : breakdownFromPreviewData(d1),
      ...overlayMeta,
    }
  } else if (appliesTo === 'avista') {
    overlay = { appliesTo: 'avista', avista: breakdownFromPreviewData(d1), ...overlayMeta }
  } else {
    overlay = { appliesTo: 'parcelado', parcelado: breakdownFromPreviewData(d1), ...overlayMeta }
  }

  const flowBreak = checkoutFlow === 'avista' ? overlay.avista : overlay.parcelado
  if (!flowBreak) {
    return {
      ok: false,
      error: 'Este cupom não é válido para a forma de pagamento selecionada.',
    }
  }

  const pub = parseCouponPublicLines(d1)

  const preview: CouponPreviewPayload = {
    ok: true,
    normalized_code: overlayMeta.code,
    applies_to: appliesTo,
    subtotal_cents: flowBreak.subtotalCents,
    discount_cents: flowBreak.discountCents,
    final_cents: flowBreak.finalCents,
    discount_type: discountCfg.discount_type,
    discount_percent_value: discountCfg.discount_percent_value,
    discount_fixed_amount_cents: discountCfg.discount_fixed_amount_cents,
    public_remaining_line: pub.remaining,
    public_valid_until_line: pub.validUntil,
  }

  return { ok: true, preview, overlay, normalizedCode: resolvedCode }
}
