/**
 * Regras puras de preço e cupom.
 * Sem Next, sem banco e sem DNS, para o bundle do navegador.
 */
export {
  applyCouponDiscountToBase,
  parseCashDiscountPercent,
  parseMaxInstallmentsFromMetadata,
} from './payments/pricing/checkout-pricing'
export type { CheckoutCouponFlow } from './payments/pricing/checkout-pricing'
export {
  buildPricePromoPublicDisplay,
  isPriceStockSoldOut,
} from './payments/pricing/price-promo'
export type { PricePromoCheckoutFlow, PricePromoPublicDisplay } from './payments/pricing/price-promo'
export { resolveCheckoutPricePromo } from './payments/pricing/checkout-price-promo'
export { evaluateLoadedCheckoutAddons } from './payments/pricing/checkout-addon-prices'
export {
  buildCouponPublicLines,
  evaluateLoadedCheckoutCoupon,
  indexOfActivePublicMessageBand,
  normalizeCouponCode,
  resolveActivePublicMessageBand,
} from './payments/coupon/discount-coupon.service'
export type { CouponPublicMessageBand, DiscountCouponRow } from './payments/coupon/discount-coupon.service'
export {
  asaasCustomerFullNameMessage,
  nameHasAtLeastTwoParts,
} from './payments/validators/customer-full-name.validators'
