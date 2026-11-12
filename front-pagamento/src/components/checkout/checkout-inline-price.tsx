'use client'

/**
 * Componente visual de steps de preço em linha.
 * Responsabilidade única: renderizar uma lista de PromoPriceStep.
 */
import { cn } from '@/lib/utils'

import type { PriceTableRow, PromoPriceStep } from './checkout-price-steps'
import { formatMoneyCents } from './checkout-price-steps'

function stepPriceClass(step: PromoPriceStep, size: 'default' | 'compact' = 'default') {
  if (size === 'compact') {
    return step.variant === 'struck'
      ? 'text-xs sm:text-sm font-medium text-muted-foreground line-through decoration-foreground/25 decoration-[1.5px]'
      : step.variant === 'mid'
        ? 'text-sm sm:text-base font-semibold text-foreground'
        : 'text-base sm:text-lg font-bold tracking-tight text-primary'
  }
  return step.variant === 'struck'
    ? 'text-base sm:text-lg font-medium text-muted-foreground line-through decoration-foreground/25 decoration-2'
    : step.variant === 'mid'
      ? 'text-xl sm:text-2xl font-semibold text-foreground'
      : 'text-2xl sm:text-3xl font-bold tracking-tight text-primary'
}

function badgeClassForSize(size: 'default' | 'compact') {
  if (size === 'compact') {
    return 'inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'
  }
  return 'inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'
}

/**
 * Tabela de preços estilo mini-contabilidade.
 * Label à esquerda, valor à direita; descontos em laranja; divisor antes do total.
 */
export function PriceBreakdownTable({
  rows,
  currency,
  ariaLabel,
}: {
  rows: PriceTableRow[]
  currency: string
  ariaLabel: string
}) {
  return (
    <div role="list" aria-label={ariaLabel} className="min-w-0 w-full space-y-0.5">
      {rows.map((row) => (
        <div
          key={row.id}
          role="listitem"
          className={cn(
            'flex items-baseline justify-between gap-4',
            row.role === 'total' ? 'py-2' : 'py-1',
            row.dividerAbove && 'border-t border-border/50 mt-2 pt-3'
          )}
        >
          <span
            className={cn(
              'min-w-0 leading-snug',
              row.role === 'base' && 'text-sm text-muted-foreground',
              row.role === 'discount' && 'text-sm font-medium text-orange-800 dark:text-orange-200',
              row.role === 'subtotal' &&
                (row.id.startsWith('addon-item-') || row.id === 'addons-line'
                  ? 'text-sm font-medium text-primary'
                  : 'text-sm font-medium text-foreground'),
              row.role === 'total' && 'text-sm font-semibold text-foreground'
            )}
          >
            {row.label}
          </span>
          <span
            className={cn(
              'shrink-0 tabular-nums text-right',
              row.role === 'base' && 'text-sm text-muted-foreground',
              row.role === 'discount' &&
                'text-sm font-semibold text-orange-800 dark:text-orange-200',
              row.role === 'subtotal' &&
                (row.id.startsWith('addon-item-') || row.id === 'addons-line'
                  ? 'text-sm font-semibold text-primary'
                  : 'text-sm font-semibold text-foreground'),
              row.role === 'total' && 'text-lg font-bold text-primary'
            )}
          >
            {row.role === 'discount'
              ? `− ${formatMoneyCents(row.cents, currency)}`
              : row.id.startsWith('addon-item-') || row.id === 'addons-line'
                ? `+ ${formatMoneyCents(row.cents, currency)}`
                : formatMoneyCents(row.cents, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function InlinePriceSteps({
  steps,
  currency,
  ariaLabel,
  pairHorizontal = false,
  size = 'default',
}: {
  steps: PromoPriceStep[]
  currency: string
  ariaLabel: string
  pairHorizontal?: boolean
  size?: 'default' | 'compact'
}) {
  const capClass =
    size === 'compact'
      ? 'text-[9px] font-semibold uppercase tracking-widest'
      : 'text-[10px] font-semibold uppercase tracking-widest'

  if (pairHorizontal && steps.length === 2) {
    return (
      <div
        className={
          size === 'compact'
            ? 'flex flex-row flex-wrap items-end gap-x-4 sm:gap-x-6 gap-y-1.5 min-w-0'
            : 'flex flex-row flex-wrap items-end gap-x-5 sm:gap-x-8 gap-y-2 min-w-0'
        }
        role="list"
        aria-label={ariaLabel}
      >
        {steps.map((step) => (
          <div key={step.id} className="min-w-0 shrink" role="listitem">
            {step.caption.trim() ? (
              <p
                className={`${capClass} ${
                  step.variant === 'final' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {step.caption}
              </p>
            ) : null}
            <div
              className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-1 min-w-0 ${
                step.caption.trim() ? 'mt-0.5' : ''
              }`}
            >
              <span className={`tabular-nums wrap-break-word ${stepPriceClass(step, size)}`}>
                {formatMoneyCents(step.cents, currency)}
              </span>
              {step.badge ? (
                <span className={`${badgeClassForSize(size)} max-w-full text-pretty`}>
                  {step.badge}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={size === 'compact' ? 'min-w-0 space-y-2' : 'min-w-0 space-y-3'}
      role="list"
      aria-label={ariaLabel}
    >
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`min-w-0 ${index > 0 ? (size === 'compact' ? 'pt-2 border-t border-border/50' : 'pt-3 border-t border-border/50') : ''}`}
          role="listitem"
        >
          {step.caption.trim() ? (
            <p
              className={`${capClass} ${
                step.variant === 'final' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {step.caption}
            </p>
          ) : null}
          <div
            className={
              step.caption.trim()
                ? size === 'compact'
                  ? 'mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 min-w-0'
                  : 'mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0'
                : 'flex flex-wrap items-baseline gap-x-1.5 gap-y-1 min-w-0'
            }
          >
            <span className={`tabular-nums wrap-break-word ${stepPriceClass(step, size)}`}>
              {formatMoneyCents(step.cents, currency)}
            </span>
            {step.badge ? (
              <span className={`${badgeClassForSize(size)} max-w-full text-pretty`}>
                {step.badge}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
