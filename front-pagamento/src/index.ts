/**
 * @quitou/admin - Biblioteca de componentes e hooks para pagamentos
 *
 * Exporta componentes React, hooks e utilitários para integração
 * em projetos Next.js que usam @quitou/core
 */

// Componentes de pagamento
export { PaymentStatus } from './components/payment/payment-status'

// Hooks
export { usePaymentPolling } from './hooks/use-payment-polling'

// Componentes de checkout
export { CheckoutForm } from './components/checkout/checkout-form'
export type { CheckoutFormData } from './components/checkout/checkout-form'

// Utilitários e helpers
export * from './lib/utils'
export * from './lib/validators'
