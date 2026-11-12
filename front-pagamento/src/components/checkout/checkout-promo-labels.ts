/**
 * Labels e tipos do CheckoutPromoSummary.
 * Responsabilidade única: configuração textual do componente de preço.
 */

export const DEFAULT_LABELS = {
  priceStepFull: 'De',
  priceStepPromo: 'Por',
  sharedPricingHeading: 'Preço',
  sidebarFullPrice: 'Preço cheio',
  sidebarParcelado: 'À prazo',
  badgePromo: 'promo limitada',
  badgeAvista: 'à vista',
  /** Faixa por prazo ou limite de vendas (promo tiers), distinta do desconto PIX/1x. */
  discountPromoLabel: 'Promo limitada',
  /** Linha na tabela: % só no PIX ou 1x no cartão (evita confundir com promo % por tempo). */
  discountAvistaLabel: 'Desconto PIX ou 1x no cartão',
  discountCouponLabel: 'Cupom de desconto',
  priceStepAvistaCash: '',
  priceStepAvistaAllInOne: 'Cartão (1x) ou PIX',
  priceStepParceladoTotal: 'Total no cartão',
  sectionAvista: 'À vista',
  sectionAvistaHint: 'PIX ou cartão em 1x.',
  sectionParcelado: 'Parcelado',
  sectionParceladoHint: 'Cartão de crédito.',
  promoDiscountDurationLine: 'Promo de {percent}% por tempo limitado',
  promoDiscountDurationLineWithFlow: 'Promo de {percent}% ({flow}) por tempo limitado',
  /**
   * Escopo quando o mesmo prazo vale para à vista e parcelado (um timer só).
   * Usado em `{flow}` de `promoTimerInlineLeadWithFlow` e no aria-label longo.
   */
  promoTimerAppliesBothFlows: 'à vista e parcelado',
  /** À esquerda na faixa do timer; `{flow}` = à vista, parcelado ou `promoTimerAppliesBothFlows`. */
  promoTimerInlineLeadWithFlow: '{percent}% na promo limitada ({flow})',
  promoTimerEndsIn: 'termina em',
  promoEnded: 'Prazo expirado',
  stock: 'Qtdes disponíveis',
  remaining: 'restantes',
  unlimited: 'Ilimitado',
  soldOut: 'Esgotado',
  flowAvista: 'cartão 1x ou PIX',
  flowParcelado: 'cartão de crédito',
  offerConditions: 'Prazo e disponibilidade da oferta',
  paymentMethodHeading: 'Pagamento',
  chooseThis: 'Escolher esse',
  chooseSelected: 'Escolhido',
  couponSubtotalCaption: 'Subtotal antes do PIX ou 1x no cartão',
  /** Linha extra na tabela de preço quando há add-ons no checkout. */
  addonExtrasLine: 'Opcionais',
  /** Lista após promo do plano + opcionais (opcionais sem a promo por tempo). */
  checkoutGrossWithAddonsLine: 'Subtotal',
  grandTotalLabel: 'Total a pagar',
  /** Última linha da tabela de composição (evita repetir o título da coluna). */
  priceTableTotalRow: 'Total',
} as const

export type CheckoutPromoSummaryLabels = typeof DEFAULT_LABELS

/**
 * Mescla rótulos padrão com metadata do preço (`checkout_stock_label`).
 */
export function checkoutPromoLabelsFromPriceMetadata(
  metadata: Record<string, unknown> | null | undefined
): CheckoutPromoSummaryLabels {
  const raw = metadata?.checkout_stock_label
  const custom = typeof raw === 'string' && raw.trim() ? raw.trim() : null
  if (!custom) return DEFAULT_LABELS
  return { ...DEFAULT_LABELS, stock: custom } as CheckoutPromoSummaryLabels
}
