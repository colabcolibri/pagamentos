import type { ResolvedCheckoutCoupon } from './discount-coupon.service'

export function buildCouponOrderMetadata(
  resolved: ResolvedCheckoutCoupon | null
): Record<string, unknown> {
  if (!resolved) return {}
  return {
    coupon_id: resolved.couponId,
    coupon_code: resolved.code,
    coupon_applies_to: resolved.appliesTo,
    coupon_discount_cents: resolved.discountCents,
    coupon_subtotal_cents: resolved.subtotalCents,
    coupon_checkout_flow: resolved.flow,
    list_amount_cents_snapshot: resolved.listAmountCents,
    cash_discount_percent_snapshot: resolved.cashDiscountPercent,
  }
}
