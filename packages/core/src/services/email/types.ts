// ==========================================
// EMAIL TYPES - Type Definitions
// ==========================================

/**
 * Configuração de email de um produto
 */
export interface ProductEmailConfig {
  order_created?: {
    from_name: string;
    from_email: string;
    reply_to?: string;
    cc?: string; // String com emails separados por vírgula (ex: "a@x.com, b@y.com")
    subject: string;
    custom_message: string;
    instructions?: string;
  };
  payment_confirmed?: {
    from_name: string;
    from_email: string;
    reply_to?: string;
    cc?: string; // String com emails separados por vírgula (ex: "a@x.com, b@y.com")
    subject: string;
    custom_message: string;
    next_steps?: string[];
    include_next_steps?: boolean;
  };
}

/**
 * Complemento de email por preço (somado ao email_config do produto).
 * Mesmos tipos de conteúdo que no produto, apenas opcionais e concatenados.
 */
export interface PriceEmailAddon {
  order_created?: {
    custom_message?: string;
    instructions?: string;
  };
  payment_confirmed?: {
    custom_message?: string;
    next_steps?: string[];
  };
}

export interface SmtpOverrides {
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  user?: string | null;
  pass?: string | null;
}

export interface EmailDispatchOptions {
  brandName?: string | null;
  brandLogoUrl?: string | null;
  footerText?: string | null;
  companyLine?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  smtp?: SmtpOverrides;
}

/**
 * Dados para envio de email de pedido criado
 */
export interface OrderCreatedEmailData {
  userEmail: string;
  userName: string;
  productName: string;
  priceDisplay: string;
  orderId: string;
  paymentMethod: string;
  /** Conteúdo extra configurado no preço da compra */
  priceEmailAddon?: PriceEmailAddon | null;
  /** Para rastreio em logs de email */
  priceId?: string;
  footerText?: string | null;
  companyLine?: string | null;
  paymentInfo?: {
    pixQrCode?: string;
    pixCopyPaste?: string;
    boletoLine?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
    paymentLinkUrl?: string;
    paymentGateway?: string; // 'pagarme' | 'asaas'
    billingType?: string; // 'BOLETO' | 'PIX' | 'CREDIT_CARD'
  };
}

/**
 * Dados para envio de email de pagamento confirmado
 */
export interface PaymentConfirmedEmailData {
  userEmail: string;
  userName: string;
  productName: string;
  priceDisplay: string;
  orderId: string;
  paymentMethod: string;
  paymentOptions?: string; // Ex: "12x de R$ 49,90"
  priceEmailAddon?: PriceEmailAddon | null;
  priceId?: string;
  footerText?: string | null;
  companyLine?: string | null;
}

/**
 * Dados para e-mail interno (admin/plataforma) quando uma venda é confirmada
 */
export interface PlatformSaleNotificationData {
  orderId: string;
  productName: string;
  customerEmail: string;
  customerName: string;
  priceDisplay: string;
  paymentMethod: string;
  brandName?: string | null;
  footerText?: string | null;
  companyLine?: string | null;
}

/**
 * Resultado do envio de email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: any;
}

/**
 * Dados do template de email
 */
export interface EmailTemplateData {
  userName: string;
  productName: string;
  priceDisplay: string;
  orderId: string;
  paymentMethod: string;
  paymentOptions?: string;
  subject: string;
  fromName: string;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  customMessage: string;
  instructions?: string;
  nextSteps?: string[];
  includeNextSteps?: boolean;
  footerText?: string | null;
  companyLine?: string | null;
  paymentInfo?: {
    pixQrCode?: string;
    pixCopyPaste?: string;
    boletoLine?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
    paymentLinkUrl?: string;
    paymentGateway?: string; // 'pagarme' | 'asaas'
  };
}

