'use client'

/**
 * Seção de prazo da promoção e disponibilidade de estoque.
 * Responsabilidade única: informações de urgência/escassez da oferta.
 */
import { useEffect, useMemo, useState } from 'react'

import type { PricePromoPublicDisplay } from '@quitou/core/pricing'
import { AlertCircle, Package } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { CheckoutPromoSummaryLabels } from './checkout-promo-labels'
import { DEFAULT_LABELS } from './checkout-promo-labels'

function formatCountdownMs(ms: number): string {
  if (ms <= 0) return ''
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (d > 0 || h > 0) parts.push(`${h}h`)
  parts.push(`${String(m).padStart(2, '0')}min`, `${String(s).padStart(2, '0')}s`)
  return parts.join(' ')
}

function fillPromoDurationTemplate(template: string, percent: number, flowLabel?: string): string {
  const p = String(Math.round(percent))
  let s = template.replace(/\{percent\}/g, p)
  if (flowLabel !== undefined) {
    s = s.replace(/\{flow\}/g, flowLabel)
  }
  return s
}

function usePromoTick(endsAtList: (string | null | undefined)[]) {
  const [, setTick] = useState(0)
  const hasDeadline = endsAtList.some((e) => e != null && e !== '')

  useEffect(() => {
    if (!hasDeadline) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasDeadline])

  return hasDeadline
}

function CountdownText({
  endsAt,
  labels,
  inBanner = false,
}: {
  endsAt: string | null | undefined
  labels: CheckoutPromoSummaryLabels
  /** Mesma linha do lead: destaque primary, alinhado ao texto da oferta. */
  inBanner?: boolean
}) {
  if (endsAt == null || endsAt === '') return null
  const endMs = new Date(endsAt).getTime() - Date.now()
  const active = endMs > 0
  if (active) {
    return (
      <time
        dateTime={endsAt}
        className={cn(
          'font-mono font-semibold tabular-nums tracking-tight wrap-break-word',
          inBanner
            ? 'text-sm text-primary whitespace-nowrap sm:text-base'
            : 'text-sm text-foreground'
        )}
      >
        {formatCountdownMs(endMs)}
      </time>
    )
  }
  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 wrap-break-word',
        inBanner && 'justify-end text-right'
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{labels.promoEnded}</span>
    </p>
  )
}

/** Bloco de estoque (quantidade disponível). */
export function CheckoutPromoStockSection({
  display,
  labels = DEFAULT_LABELS,
  className,
}: {
  display: PricePromoPublicDisplay
  labels?: CheckoutPromoSummaryLabels
  className?: string
}) {
  const { stock } = display
  return (
    <div
      className={cn('flex min-w-0 items-center gap-3', className)}
      role="group"
      aria-label={labels.stock}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/90 text-muted-foreground"
        aria-hidden
      >
        <Package className="h-4 w-4 shrink-0" />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground wrap-break-word">
        <span className="font-medium text-muted-foreground">{labels.stock}:</span>{' '}
        {stock.soldOut ? (
          <span className="inline-flex flex-wrap items-center gap-1.5 font-semibold align-middle">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <span className="text-destructive">{labels.soldOut}</span>
          </span>
        ) : stock.remaining != null ? (
          <>
            <span className="font-semibold tabular-nums text-foreground">{stock.remaining}</span>{' '}
            <span className="text-muted-foreground">{labels.remaining}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{labels.unlimited}</span>
        )}
      </p>
    </div>
  )
}

/** Faixa única: esquerda “X% na promo limitada”, direita “termina em” + countdown. */
function PromoTimerBannerRow({
  ariaLabel,
  leadText,
  endsAt,
  labels,
}: {
  ariaLabel: string
  leadText: string
  endsAt: string | null | undefined
  labels: CheckoutPromoSummaryLabels
}) {
  if (!endsAt) return null
  const discountBannerClass =
    'rounded-lg border border-primary/25 bg-primary/[0.09] px-3 py-2.5 shadow-sm sm:px-4 sm:py-2.5 dark:bg-primary/15 dark:border-primary/30'
  return (
    <div
      className={cn(
        discountBannerClass,
        'ring-1 ring-primary/10',
        'flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-4 sm:gap-y-0'
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground text-pretty sm:min-w-[12ch]">
        {leadText}
      </p>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5',
          'w-full sm:w-auto sm:max-w-[min(100%,20rem)] sm:shrink-0 sm:justify-end'
        )}
      >
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">
          {labels.promoTimerEndsIn}
        </span>
        <CountdownText endsAt={endsAt} labels={labels} inBanner />
      </div>
    </div>
  )
}

/** Timer da promoção (countdown). */
export function CheckoutPromoTimerSection({
  display,
  labels = DEFAULT_LABELS,
  className,
}: {
  display: PricePromoPublicDisplay
  labels?: CheckoutPromoSummaryLabels
  className?: string
}) {
  const { avista, parcelado } = display

  const endsAtList = useMemo(
    () => [avista.endsAt, parcelado.endsAt],
    [avista.endsAt, parcelado.endsAt]
  )
  usePromoTick(endsAtList)

  const endA = avista.endsAt && avista.endsAt !== '' ? avista.endsAt : null
  const endP = parcelado.endsAt && parcelado.endsAt !== '' ? parcelado.endsAt : null
  const sameDeadline = Boolean(endA && endP && endA === endP)
  const onlyAvistaEnd = Boolean(endA && !endP)
  const onlyParceladoEnd = Boolean(!endA && endP)
  const showSingleTimer = Boolean(sameDeadline || onlyAvistaEnd || onlyParceladoEnd)
  const showDualTimer = Boolean(endA && endP && endA !== endP)
  const singleEndsAt = sameDeadline ? endA : onlyAvistaEnd ? endA : onlyParceladoEnd ? endP : null
  const hasTimer = Boolean(showSingleTimer && !showDualTimer && singleEndsAt) || showDualTimer

  const singleDiscountPercent =
    sameDeadline || onlyAvistaEnd
      ? avista.discountPercent
      : onlyParceladoEnd
        ? parcelado.discountPercent
        : 0

  const singleTimerScopeLabel = sameDeadline
    ? labels.promoTimerAppliesBothFlows
    : onlyAvistaEnd
      ? labels.sectionAvista
      : labels.sectionParcelado

  if (!hasTimer) return null

  return (
    <div className={cn('min-w-0 space-y-3', className)}>
      {showSingleTimer && !showDualTimer && singleEndsAt ? (
        <div className="min-w-0">
          <PromoTimerBannerRow
            ariaLabel={fillPromoDurationTemplate(
              labels.promoDiscountDurationLineWithFlow,
              singleDiscountPercent,
              singleTimerScopeLabel
            )}
            leadText={fillPromoDurationTemplate(
              labels.promoTimerInlineLeadWithFlow,
              singleDiscountPercent,
              singleTimerScopeLabel
            )}
            endsAt={singleEndsAt}
            labels={labels}
          />
        </div>
      ) : null}

      {showDualTimer ? (
        <div className="min-w-0 space-y-3">
          <PromoTimerBannerRow
            ariaLabel={fillPromoDurationTemplate(
              labels.promoDiscountDurationLineWithFlow,
              avista.discountPercent,
              labels.sectionAvista
            )}
            leadText={fillPromoDurationTemplate(
              labels.promoTimerInlineLeadWithFlow,
              avista.discountPercent,
              labels.sectionAvista
            )}
            endsAt={endA}
            labels={labels}
          />
          <PromoTimerBannerRow
            ariaLabel={fillPromoDurationTemplate(
              labels.promoDiscountDurationLineWithFlow,
              parcelado.discountPercent,
              labels.sectionParcelado
            )}
            leadText={fillPromoDurationTemplate(
              labels.promoTimerInlineLeadWithFlow,
              parcelado.discountPercent,
              labels.sectionParcelado
            )}
            endsAt={endP}
            labels={labels}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Prazo da promo + disponibilidade (estoque). @deprecated Use CheckoutPromoTimerSection + CheckoutPromoStockSection */
export function CheckoutPromoOfferSection({
  display,
  labels = DEFAULT_LABELS,
  className,
}: {
  display: PricePromoPublicDisplay
  labels?: CheckoutPromoSummaryLabels
  className?: string
}) {
  return (
    <div
      className={cn('min-w-0 space-y-5 mt-2 mb-4', className)}
      role="region"
      aria-label={labels.offerConditions}
    >
      <CheckoutPromoTimerSection display={display} labels={labels} />
      <CheckoutPromoStockSection display={display} labels={labels} />
    </div>
  )
}
