'use client'

/**
 * Bloco de preços para o card do produto (coluna esquerda do checkout / sidebar).
 * Exibe preço cheio, à vista e parcelado com badges de desconto.
 */
import type { PricePromoPublicDisplay } from '@quitou/core/pricing'

import { cn } from '@/lib/utils'

import {
  formatMoneyCents,
  sidebarAvistaDiscountBadges,
  sidebarParceladoDiscountBadges,
} from './checkout-price-steps'
import { DEFAULT_LABELS } from './checkout-promo-labels'
import type { CheckoutPromoSummaryLabels } from './checkout-promo-labels'

function CheckoutSidebarPriceRow({
  label,
  cents,
  currency,
  badges,
  withTopDivider,
}: {
  label: string
  cents: number
  currency: string
  badges: string[]
  withTopDivider: boolean
}) {
  return (
    <div
      className={cn('min-w-0 space-y-2', withTopDivider && 'mt-4 pt-4 border-t border-border/50')}
    >
      <p className="text-sm font-medium text-muted-foreground wrap-break-word">{label}</p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 min-w-0">
        <span className="text-lg sm:text-xl font-semibold tabular-nums text-primary wrap-break-word leading-snug">
          {formatMoneyCents(cents, currency)}
        </span>
        {badges.map((b, i) => (
          <span
            key={`${b}-${i}`}
            className={cn(
              'inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400',
              'max-w-full text-pretty'
            )}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Card do produto (coluna esquerda): preço de lista, valor à vista (com badges de desconto)
 * e valor à prazo no cartão.
 */
export function CheckoutSharedPriceBlock({
  display,
  currency = 'BRL',
  labels = DEFAULT_LABELS,
  className,
}: {
  display: PricePromoPublicDisplay
  currency?: string
  labels?: CheckoutPromoSummaryLabels
  className?: string
}) {
  const catalog = display.catalogListCents
  const avistaCents = display.avista.promoListCents
  const parceladoCents = display.parcelado.promoListCents
  const avistaBadges = sidebarAvistaDiscountBadges(display, labels)
  const parceladoBadges = sidebarParceladoDiscountBadges(display, labels)

  const fullPriceText = formatMoneyCents(catalog, currency)
  const avistaText = formatMoneyCents(avistaCents, currency)
  const parceladoText = formatMoneyCents(parceladoCents, currency)
  const ariaLabel = [
    `${labels.sidebarFullPrice}: ${fullPriceText}`,
    `${labels.sectionAvista}: ${avistaText}`,
    `${labels.sidebarParcelado}: ${parceladoText}`,
  ].join('. ')

  return (
    <div
      className={cn('min-w-0 border-t border-border/60 pt-6 mt-6 pb-4 mb-0', className)}
      role="region"
      aria-label={ariaLabel}
    >
      <CheckoutSidebarPriceRow
        label={labels.sidebarFullPrice}
        cents={catalog}
        currency={currency}
        badges={[]}
        withTopDivider={false}
      />
      <CheckoutSidebarPriceRow
        label={labels.sectionAvista}
        cents={avistaCents}
        currency={currency}
        badges={avistaBadges}
        withTopDivider
      />
      <CheckoutSidebarPriceRow
        label={labels.sidebarParcelado}
        cents={parceladoCents}
        currency={currency}
        badges={parceladoBadges}
        withTopDivider
      />
    </div>
  )
}
