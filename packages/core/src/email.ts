// ==========================================
// @quitou/core - Email Service (Server-Only)
// ==========================================

/**
 * Este arquivo deve ser importado APENAS em server-side code
 * (API routes, server components, etc.)
 * 
 * Nunca importe este arquivo em hooks ou componentes client-side!
 */

import 'server-only';

// Re-export all email service functions and types
export {
    buildEmailFooterHtml,
    buildEmailFooterText,
    createEmailTransporter,
    emailBrand,
    escapeEmailHtml,
    generateEmailHtml,
    generateEmailText,
    renderEmailDocument,
    sendOrderCreatedEmail,
    sendPaymentConfirmedEmail,
    sendPlatformSaleNotificationEmail,
    verifySmtpConnection
} from './services/email';

export type {
    EmailDispatchOptions,
    EmailSendResult,
    EmailTemplateData,
    OrderCreatedEmailData,
    PaymentConfirmedEmailData,
    PlatformSaleNotificationData,
    PriceEmailAddon,
    ProductEmailConfig,
    SmtpOverrides
} from './services/email';

