/**
 * Preço base por fluxo (à vista vs parcelado) e aplicação de desconto de cupom.
 * Toda decisão monetária crítica deve espelhar estes helpers no checkout (backend).
 */

export type CheckoutCouponFlow = 'avista' | 'parcelado'

export function parseCashDiscountPercent(metadata: Record<string, unknown>): number {
  const raw = metadata.cash_discount
  if (typeof raw === 'number') return raw > 0 ? raw : 0
  if (typeof raw === 'string') return parseFloat(raw) || 0
  return 0
}

/** `metadata.max_installments` do preço — mesmo critério do checkout (mínimo 1). */
export function parseMaxInstallmentsFromMetadata(metadata: Record<string, unknown>): number {
  const raw = metadata.max_installments
  let n: number
  if (typeof raw === 'number' && Number.isFinite(raw)) n = Math.floor(raw)
  else if (typeof raw === 'string') n = parseInt(raw, 10)
  else return 1
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 48)
}

/** Preço cheio (lista) em centavos após desconto à vista configurado no preço (metadata). */
export function cashBaseCentsFromList(listAmountCents: number, cashDiscountPercent: number): number {
  if (cashDiscountPercent <= 0) return listAmountCents
  return Math.round(listAmountCents * (1 - cashDiscountPercent / 100))
}

/**
 * Base para aplicação do cupom.
 * Cupom aplica sempre sobre o preço de lista (após tier promo, antes do desconto à vista).
 * O desconto à vista é aplicado DEPOIS do cupom, na última etapa.
 */
export function subtotalCentsForFlow(
  listAmountCents: number,
  _cashDiscountPercent: number,
  _flow: CheckoutCouponFlow
): number {
  return listAmountCents
}

export type CouponDiscountRow = {
  discount_type: 'percent' | 'fixed_cents'
  discount_percent: string | number | null
  discount_amount_cents: number | null
  applies_to?: 'avista' | 'parcelado' | 'both'
}

/**
 * Aplica desconto do cupom sobre a base já escolhida (à vista ou lista cheia).
 * Garante valor final >= 1 centavo quando a base > 0.
 */
export function applyCouponDiscountToBase(
  baseCents: number,
  coupon: CouponDiscountRow
): { discountCents: number; finalCents: number } {
  const base = Math.max(0, baseCents)
  if (base <= 0) return { discountCents: 0, finalCents: 0 }

  let rawDiscount = 0
  if (coupon.discount_type === 'percent') {
    const pct =
      typeof coupon.discount_percent === 'string'
        ? parseFloat(coupon.discount_percent)
        : Number(coupon.discount_percent ?? 0)
    if (!Number.isFinite(pct) || pct <= 0) return { discountCents: 0, finalCents: base }
    rawDiscount = Math.round((base * pct) / 100)
  } else {
    const fixed = coupon.discount_amount_cents ?? 0
    if (fixed <= 0) return { discountCents: 0, finalCents: base }
    rawDiscount = fixed
  }

  rawDiscount = Math.min(base, Math.max(0, rawDiscount))
  const finalCents = base > 0 ? Math.max(1, base - rawDiscount) : 0
  const discountCents = base - finalCents
  return { discountCents, finalCents }
}

/** Percentual efetivo (0–100) para APIs que só aceitam % sobre o preço cheio (ex.: Pagar.me PIX). */
export function effectiveListToCashDiscountPercent(
  listAmountCents: number,
  finalCashCents: number
): number {
  if (listAmountCents <= 0) return 0
  const ratio = finalCashCents / listAmountCents
  const clamped = Math.min(1, Math.max(0, ratio))
  const off = 100 * (1 - clamped)
  return Math.round(off * 100) / 100
}

/**
 * Pagar.me: uma sessão pode oferecer 1x (à vista do produto + cupom) e Nx (lista + cupom parcelado).
 * Ordem: tier promo → cupom → cash discount (só à vista).
 */
export function buildPagarmeLineTotals(
  listAmountCents: number,
  cashDiscountPercent: number,
  couponRow: CouponDiscountRow | null
): {
  installmentOneTotal: number
  installmentMultiTotal: number
  pixBoletoDiscountPercent: number | null
} {
  let installmentOneTotal = listAmountCents
  let installmentMultiTotal = listAmountCents

  if (couponRow) {
    if (couponRow.applies_to === 'avista' || couponRow.applies_to === 'both') {
      installmentOneTotal = applyCouponDiscountToBase(listAmountCents, couponRow).finalCents
    }
    if (couponRow.applies_to === 'parcelado' || couponRow.applies_to === 'both') {
      installmentMultiTotal = applyCouponDiscountToBase(listAmountCents, couponRow).finalCents
    }
  }

  // Desconto à vista aplica por último, depois do cupom
  if (cashDiscountPercent > 0) {
    installmentOneTotal = cashBaseCentsFromList(installmentOneTotal, cashDiscountPercent)
  }

  const pixPct = effectiveListToCashDiscountPercent(listAmountCents, installmentOneTotal)
  const pixBoletoDiscountPercent = pixPct > 0 ? pixPct : null

  return { installmentOneTotal, installmentMultiTotal, pixBoletoDiscountPercent }
}
