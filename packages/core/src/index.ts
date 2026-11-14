// ==========================================
// @quitou/core - Exports Públicos
// ==========================================

// ==========================================
// Errors & Logging
// ==========================================
export * from './errors'
export * from './logger'

// ==========================================
// Payments Domain
// ==========================================
export * from './payments'

// ==========================================
// Admin Domain
// ==========================================
export * from './admin'

// Email: '@quitou/core/email'. Preço e cupom no navegador: '@quitou/core/pricing'.

// ==========================================
// Factories
// ==========================================
export * from './factories'

// ==========================================
// Routes (Webhooks e Checkout Handlers)
// ==========================================
export { createAsaasCheckoutAvistaHandler } from './routes/asaas-checkout-avista'
export type { AsaasCheckoutAvistaOptions } from './routes/asaas-checkout-avista'
export { createAsaasCheckoutParceladoHandler } from './routes/asaas-checkout-parcelado'
export type { AsaasCheckoutParceladoOptions } from './routes/asaas-checkout-parcelado'
export { createAsaasWebhookHandler } from './routes/asaas-webhook'
export { createPagarmeCheckoutHandler } from './routes/pagarme-checkout'
export type { PagarmeCheckoutOptions } from './routes/pagarme-checkout'
export { createPagarmeWebhookHandler } from './routes/pagarme-webhook'
export type {
    AsaasWebhookOptions,
    PagarmeWebhookOptions,
    RouteHandler,
    WebhookHandlerOptions
} from './types/routes'

// Webhook de produto: import from '@quitou/core/product-webhook' (usa node:dns, fora do barrel do client)

// ==========================================
// Helpers
// ==========================================
/** Reexport nomeado: alguns bundlers não expandem `export *` em cadeia até este símbolo. */
export { buildPricePromoPublicDisplay } from './payments/pricing/price-promo'
export {
    applyCouponDiscountToBase,
    parseCashDiscountPercent,
    parseMaxInstallmentsFromMetadata,
} from './payments/pricing/checkout-pricing'
export { resolveCheckoutPricePromo } from './payments/pricing/checkout-price-promo'
export { recordPricePromoSalesAfterOrderPaid } from './payments/pricing/record-price-promo-sales'
export { evaluateLoadedCheckoutAddons } from './payments/pricing/checkout-addon-prices'
export {
    buildCouponPublicLines,
    couponAllowsPriceId,
    couponAllowsProductId,
    couponAppliesToFlow,
    evaluateLoadedCheckoutCoupon,
    normalizeCouponCode,
    resolveCheckoutCoupon,
} from './payments/coupon/discount-coupon.service'
export { resolveCheckoutAddonsForAnchor } from './payments/pricing/checkout-addon-prices'
export type { PricePromoPublicDisplay } from './payments/pricing/price-promo'
export {
    sendOtpAndCreateUserIfNeeded,
    upsertUserProfile
} from './helpers/auth'
export type { AccessCodeGateway, AccessCodeRequest, AccessCodeResult } from './helpers/auth'
export { decryptStoredSecret, encryptStoredSecret } from './security/secret-box'
export {
    checkExistingPayment,
    createPendingSubscription,
    getPriceWithProduct
} from './helpers/checkout'

// ==========================================
// Utilitários
// ==========================================
export {
    calculateCashPrice,
    calculateInstallmentPrice,
    delay,
    formatCurrency,
    formatPrice,
    formatProductPrice,
    generateOrderId,
    getPaymentMethodLabel,
    isValidCNPJ,
    isValidCPF,
    isValidEmail,
    maskCEP,
    maskCNPJ,
    maskCPF,
    maskPhone,
    validateCustomerData
} from './utils/checkout-utils'

// Payment Methods Utilities
export {
    ALL_PAYMENT_METHODS,
    DEFAULT_PAYMENT_METHODS,
    getAllowedMethods,
    getDisabledMethods,
    getGatewayForMethod,
    hasValidPaymentMethods,
    isPaymentMethodAllowed
} from './utils/payment-methods'

// ==========================================
// Types (Legacy - manter para compatibilidade)
// ==========================================
export type {
    AsaasPayment,
    CheckoutFormData,
    CheckoutStatus,
    CustomerData,
    Database,
    EmailConfig,
    PagarmePayment,
    PaymentGateway,
    PaymentLinkEmailData,
    PaymentMetadata,
    PaymentConfirmedWebhookPayload,
    PaymentMethod,
    PaymentStatus,
    Price,
    PriceMetadata,
    Product,
    ProductMetadata,
    ProductRefundPolicy,
    ProductWithPrice,
    RefundPolicyContent,
    RefundPolicySection,
    Subscription
} from './types'

// ==========================================
// Validators (Legacy - manter para compatibilidade)
// ==========================================
export { checkoutFormSchema } from './validators'
export type { CheckoutFormData as ValidatedCheckoutFormData } from './validators'
