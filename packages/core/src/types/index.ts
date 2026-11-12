// ==========================================
// TIPOS CENTRALIZADOS DO SISTEMA DE PAGAMENTOS
// ==========================================

import { Database } from './supabase-types';

// ==========================================
// TIPOS DO SUPABASE
// ==========================================

export type Product = Database['payments']['Tables']['products']['Row'];
export type Price = Database['payments']['Tables']['prices']['Row'];
export type Subscription = Database['payments']['Tables']['subscriptions']['Row'];
export type PagarmePayment = Database['payments']['Tables']['pagarme_payments']['Row'];
export type AsaasPayment = Database['payments']['Tables']['asaas_payments']['Row'];

// ==========================================
// PAYMENT METHODS (Métodos de Pagamento)
// ==========================================

export type PaymentMethod = 
  | 'credit_card'      // Cartão de Crédito (Pagar.me)
  | 'pix'              // PIX (Pagar.me)
  | 'boleto'           // Boleto à vista (Pagar.me)
  | 'asaas_boleto_parcelado'; // Boleto Parcelado (Asaas)

export type PaymentGateway = 'pagarme' | 'asaas';

// ==========================================
// TIPOS DE PRODUTOS E PREÇOS
// ==========================================

export interface ProductWithPrice extends Product {
  prices: Price[];
  mainPrice?: Price;
  formattedPrice?: string;
  formattedCashTag?: string;
  formattedInstallmentsTag?: string;
}

// ==========================================
// METADATA TYPES (Exemplos - customize conforme seu negócio)
// ==========================================

// Exemplo de metadata para Products
export interface ProductMetadata {
  type?: string; // 'course', 'ebook', 'service', etc
  category?: string;
  tags?: string[];
  duration_days?: number;
  target_plan?: string;
  features?: string[];
  [key: string]: any; // Permite campos customizados
}

// Exemplo de metadata para Prices
export interface PriceMetadata {
  cash_discount?: number; // Percentual
  max_installments?: number;
  min_installment?: number;
  trial_days?: number;
  setup_fee?: number;
  /** true = acesso vitalício (pagamento único) ou enquanto assinatura ativa */
  lifetime_access?: boolean;
  /** Meses de acesso ao produto. Relevante quando lifetime_access é false */
  access_months?: number;
  [key: string]: any;
}

// Exemplo de metadata para Payments
export interface PaymentMetadata {
  coupon_code?: string;
  affiliate_id?: string;
  utm_source?: string;
  utm_campaign?: string;
  notes?: string;
  refund_policy_accepted?: boolean;
  refund_policy_acceptance_date?: string;
  refund_policy_content?: RefundPolicyContent | null;
  [key: string]: any;
}

// ==========================================
// TIPOS DE CHECKOUT
// ==========================================

export interface CheckoutFormData {
  name: string;
  email: string;
  acceptedRefundPolicy: boolean;
  paymentMethod?: 'pagarme' | 'asaas_boleto_parcelado';
  personType?: 'fisica' | 'juridica';
  cpf?: string;
  cnpj?: string;
  razaoSocial?: string;
  ie?: string;
  im?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  installments?: number;
}

export interface CustomerData {
  name: string;
  email: string;
}

export type PaymentStatus =
  | 'idle'
  | 'initializing'
  | 'validating'
  | 'creating-user'
  | 'processing-payment'
  | 'checking-status'
  | 'waiting'
  | 'success'
  | 'error'
  | 'restored'
  | 'boleto-generated'
  | 'boleto_generated'
  | 'pix_generated';

export type CheckoutStatus = PaymentStatus;

// ==========================================
// TIPOS DE POLÍTICA DE REEMBOLSO
// ==========================================

export interface RefundPolicySection {
  title: string;
  content: string[];
  highlighted?: boolean;
}

export interface RefundPolicyContent {
  title: string;
  subtitle: string;
  sections: RefundPolicySection[];
  footer: string;
  checkout: {
    buttonText: string;
    acceptanceText: string;
    acceptanceRequired: string;
  };
}

export interface ProductRefundPolicy {
  productType: string;
  productName: string;
  policy: RefundPolicyContent;
}

// ==========================================
// TIPOS DE EMAIL
// ==========================================

export interface EmailConfig {
  fromName: string;
  fromEmail: string;
  ccEmail?: string;
  subject: string;
}

export interface PaymentLinkEmailData {
  userEmail: string;
  userName: string;
  productName: string;
  paymentLinkUrl: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
}

// ==========================================
// WEBHOOK OUTBOUND (pagamento confirmado → sistema externo)
// ==========================================

/** Payload enviado para webhook_url do produto quando pagamento é confirmado */
export interface PaymentConfirmedWebhookPayload {
  event: 'payment.confirmed'
  sent_at: string
  order: {
    id: string
    user_id: string
    product_id: string
    price_id: string
    subscription_id: string | null
    order_type: 'one_time' | 'subscription'
    status: 'paid'
    amount_cents: number
    payment_method: string | null
    payment_gateway: 'pagarme' | 'asaas'
    paid_at: string | null
    metadata: Record<string, unknown> | null
    created_at: string | null
  }
  user: {
    id: string
    email: string
    name: string
  }
  product: {
    id: string
    ref: string
    name: string
  }
  price: {
    id: string
    ref: string
    amount: number
    currency: string
    recurring: boolean
    interval: string | null
    interval_count: number | null
  }
}

// ==========================================
// RE-EXPORT DATABASE TYPE
// ==========================================

export type { Database };
