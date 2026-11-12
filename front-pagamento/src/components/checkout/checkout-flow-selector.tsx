'use client'

/**
 * Card seletor de fluxo de pagamento (À vista / Parcelado).
 * Responsabilidade única: UI de seleção de fluxo, sem lógica de preço.
 */
import type { ReactNode } from 'react'

import type { PricePromoCheckoutFlow } from '@quitou/core/pricing'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FlowPriceColumn({
  title,
  hint,
  selected,
  children,
  selectFlow,
  onSelectFlow,
  choiceDisabled,
  chooseLabel,
  chosenLabel,
  ariaDescription,
}: {
  title: string
  hint?: string
  selected: boolean
  children?: ReactNode
  selectFlow?: PricePromoCheckoutFlow
  onSelectFlow?: (flow: PricePromoCheckoutFlow) => void
  choiceDisabled?: boolean
  chooseLabel: string
  chosenLabel: string
  ariaDescription?: string
}) {
  const showChoose = Boolean(onSelectFlow && selectFlow)

  return (
    <div
      className={cn(
        'rounded-xl border min-w-0 transition-colors',
        selected
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/60 bg-muted/15'
      )}
      aria-current={selected ? 'true' : undefined}
    >
      {ariaDescription ? <span className="sr-only">{ariaDescription}</span> : null}

      <div className="px-4 py-3 min-w-0 flex flex-col gap-3 h-full">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              selected ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {title}
          </p>
          {hint?.trim() ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug wrap-break-word">
              {hint}
            </p>
          ) : null}
          {children ? <div className="mt-1">{children}</div> : null}
        </div>

        {showChoose ? (
          <div className="mt-auto">
            <Button
              type="button"
              variant={selected ? 'secondary' : 'default'}
              size="sm"
              className="w-full"
              disabled={choiceDisabled || selected}
              onClick={() => onSelectFlow!(selectFlow!)}
            >
              {selected ? chosenLabel : chooseLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
