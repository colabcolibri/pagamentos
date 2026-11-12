'use client'

/**
 * Resumo de preço e seleção de fluxo de pagamento no checkout.
 * Orquestra: cascata de preços do fluxo selecionado + seletores de fluxo + seção de oferta.
 */
import { useMemo } from 'react'

import type { PricePromoCheckoutFlow, PricePromoPublicDisplay } from '@quitou/core/pricing'

import { RequiredFieldMark } from '@/components/checkout/required-field-mark'

import { FlowPriceColumn } from './checkout-flow-selector'
import { PriceBreakdownTable } from './checkout-inline-price'
import {
  type CheckoutAddonTableLine,
  buildFlowPriceTable,
  formatMoneyCents,
} from './checkout-price-steps'
import type { CheckoutPromoCouponOverlay } from './checkout-price-steps'
import { DEFAULT_LABELS } from './checkout-promo-labels'
import type { CheckoutPromoSummaryLabels } from './checkout-promo-labels'
import { CheckoutPromoOfferSection } from './checkout-promo-offer'

export type {
  CheckoutAddonTableLine,
  CheckoutPromoCouponFlowBreakdown,
  CheckoutPromoCouponOverlay,
} from './checkout-price-steps'
export { CheckoutPromoOfferSection } from './checkout-promo-offer'
export { CheckoutSharedPriceBlock } from './checkout-shared-price-block'
export { checkoutPromoLabelsFromPriceMetadata } from './checkout-promo-labels'
export type { CheckoutPromoSummaryLabels } from './checkout-promo-labels'

function installmentsLineToAte(line: string): string {
  return line.trim().replace(/^\s*ou\s+/i, 'Até ')
}

export function CheckoutPromoSummary({
  display,
  flow,
  currency = 'BRL',
  labels = DEFAULT_LABELS,
  installmentsLine,
  onSelectFlow,
  choiceDisabled = false,
  showOfferSection = true,
  couponOverlay = null,
  addonExtraCents = 0,
  addonLineItems,
}: {
  display: PricePromoPublicDisplay
  flow: PricePromoCheckoutFlow
  currency?: string
  labels?: CheckoutPromoSummaryLabels
  installmentsLine?: string | null
  onSelectFlow?: (flow: PricePromoCheckoutFlow) => void
  choiceDisabled?: boolean
  showOfferSection?: boolean
  couponOverlay?: CheckoutPromoCouponOverlay | null
  /** Soma dos add-ons escolhidos (mesma lógica do servidor / estimateAddonCents). */
  addonExtraCents?: number
  /** Linhas nomeadas na tabela de preço (opcional). */
  addonLineItems?: CheckoutAddonTableLine[]
}) {
  const addonFromLines =
    addonLineItems?.reduce((s, x) => s + Math.max(0, Math.round(x.cents)), 0) ?? 0
  const addon = addonFromLines > 0 ? addonFromLines : Math.max(0, addonExtraCents)

  const parceladoAddonTop =
    couponOverlay?.parcelado && couponOverlay.parcelado.discountCents > 0 && addon > 0 ? 0 : addon

  const rows = useMemo(() => {
    const items = addonLineItems?.filter((x) => x.label?.trim() && Math.round(x.cents) > 0) ?? []
    return buildFlowPriceTable(flow, display, couponOverlay, labels, currency, {
      addonListCents: addon > 0 && items.length === 0 ? addon : undefined,
      addonLineItems: items.length > 0 ? items : undefined,
    })
  }, [flow, display, couponOverlay, labels, currency, addon, addonLineItems])

  const showInstallments = Boolean(installmentsLine?.trim())

  const avistaFinalCents = (() => {
    if (couponOverlay?.avista != null) {
      return couponOverlay.avista.finalCents
    }
    const afterTier = display.avista.afterPromoTierCents ?? display.avista.promoListCents
    const pct = display.avista.cashDiscountPercent ?? 0
    const merged = afterTier + addon
    if (pct <= 0) return merged
    if (merged <= 0) return 0
    return Math.max(1, merged - Math.round((merged * pct) / 100))
  })()
  const avistaFinalFormatted = formatMoneyCents(avistaFinalCents, currency)

  const parceladoFinalCents =
    (couponOverlay?.parcelado?.finalCents ?? display.parcelado.promoListCents) + parceladoAddonTop
  const parceladoFinalFormatted = formatMoneyCents(parceladoFinalCents, currency)

  const parceladoAriaHint = useMemo(() => {
    const totalCents =
      (couponOverlay?.parcelado?.finalCents ?? display.parcelado.promoListCents) + parceladoAddonTop
    const total = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(totalCents / 100)
    return `Total no cartão parcelado ${total}.`
  }, [
    display.parcelado.promoListCents,
    couponOverlay?.parcelado?.finalCents,
    currency,
    parceladoAddonTop,
  ])

  return (
    <section className="min-w-0 text-left" aria-labelledby="checkout-price-summary-title">
      <h2 id="checkout-price-summary-title" className="sr-only">
        Resumo do valor
      </h2>

      <div className="min-w-0 space-y-4">
        {/* Tabela de preços do fluxo selecionado */}
        <div className="min-w-0 pb-4 border-b border-border/60">
          <PriceBreakdownTable
            rows={rows}
            currency={currency}
            ariaLabel={labels.sharedPricingHeading}
          />
        </div>

        {onSelectFlow ? (
          <p className="text-sm font-medium text-foreground inline-flex flex-wrap items-baseline gap-0.5">
            <span>{labels.paymentMethodHeading}</span>
            <RequiredFieldMark className="shrink-0" />
          </p>
        ) : null}

        {/* Seletores de fluxo — sem preço interno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0 md:gap-3 md:items-stretch">
          <FlowPriceColumn
            title={labels.sectionAvista}
            hint={labels.sectionAvistaHint}
            selected={flow === 'avista'}
            selectFlow="avista"
            onSelectFlow={onSelectFlow}
            choiceDisabled={choiceDisabled}
            chooseLabel={labels.chooseThis}
            chosenLabel={labels.chooseSelected}
          >
            <p className="text-base sm:text-lg font-bold text-primary tabular-nums leading-snug">
              {avistaFinalFormatted}
            </p>
          </FlowPriceColumn>

          <FlowPriceColumn
            title={labels.sectionParcelado}
            hint={labels.sectionParceladoHint}
            selected={flow === 'parcelado'}
            selectFlow="parcelado"
            onSelectFlow={onSelectFlow}
            choiceDisabled={choiceDisabled}
            chooseLabel={labels.chooseThis}
            chosenLabel={labels.chooseSelected}
            ariaDescription={parceladoAriaHint}
          >
            {showInstallments && installmentsLine ? (
              <p className="text-base sm:text-lg font-bold text-primary tabular-nums leading-snug">
                {installmentsLineToAte(installmentsLine)}
              </p>
            ) : (
              <p className="text-base sm:text-lg font-bold text-primary tabular-nums leading-snug">
                {parceladoFinalFormatted}
              </p>
            )}
            {showInstallments && installmentsLine ? (
              <p className="text-xs text-muted-foreground tabular-nums leading-snug">
                Total: {parceladoFinalFormatted}
              </p>
            ) : null}
          </FlowPriceColumn>
        </div>

        {showOfferSection ? <CheckoutPromoOfferSection display={display} labels={labels} /> : null}
      </div>
    </section>
  )
}
