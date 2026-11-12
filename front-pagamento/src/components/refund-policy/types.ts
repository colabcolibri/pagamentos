// ==========================================
// TIPOS PADRONIZADOS PARA POLÍTICAS DE REEMBOLSO
// ==========================================

export interface RefundPolicySection {
  title: string
  content: string[]
  highlighted?: boolean
}

export interface RefundPolicyContent {
  title: string
  subtitle: string
  sections: RefundPolicySection[]
  footer: string
  checkout: {
    buttonText: string
    acceptanceText: string
    acceptanceRequired: string
  }
}

export interface ProductRefundPolicy {
  productType: 'subscription' | 'course' | 'digital_product' | 'service' | 'physical_product'
  productName: string
  policy: RefundPolicyContent
}
