'use client'

import { Badge } from '@/components/ui/badge'
import { checkoutPriceLineTitle } from '@/lib/checkout/offer-display'
import type { Price } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

const RECURRENCE_LABELS: Record<string, string> = {
  month: 'Mensal',
  quarter: 'Trimestral',
  semester: 'Semestral',
  year: 'Anual',
}

function formatMoney(cents: number, currency: string): string {
  const value = cents / 100
  const hasDecimals = value % 1 !== 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: (currency || 'BRL').toUpperCase(),
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value)
}

export function isPriceSoldOut(price: Pick<Price, 'stock_cap' | 'stock_sold'>): boolean {
  if (price.stock_cap == null || price.stock_cap <= 0) return false
  return (price.stock_sold ?? 0) >= price.stock_cap
}

function getStockLabel(price: Pick<Price, 'stock_cap' | 'stock_sold'>): {
  label: string
  soldOut: boolean
  urgent: boolean
} | null {
  if (price.stock_cap == null || price.stock_cap <= 0) return null
  const remaining = Math.max(0, price.stock_cap - (price.stock_sold ?? 0))
  if (remaining === 0) {
    return { label: 'Esgotado', soldOut: true, urgent: false }
  }
  return {
    label: remaining === 1 ? '1 disponível' : `${remaining} disponíveis`,
    soldOut: false,
    urgent: remaining <= 5,
  }
}

export function ProductPriceSelector({
  prices,
  selectedPriceId,
  onSelectPrice,
  disabled = false,
}: {
  prices: Price[]
  selectedPriceId: string
  onSelectPrice: (priceId: string) => void
  disabled?: boolean
}) {
  if (prices.length <= 1) return null

  const isTwoOptions = prices.length === 2

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Opções do produto">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Escolha o plano
      </p>

      <div
        className={cn('grid gap-2', isTwoOptions ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
      >
        {prices.map((price) => {
          const isSelected = price.id === selectedPriceId
          const stock = getStockLabel(price)
          const soldOut = stock?.soldOut ?? false
          const recurrence =
            price.recurring && typeof price.recurring === 'object' && 'interval' in price.recurring
              ? (RECURRENCE_LABELS[String((price.recurring as { interval: string }).interval)] ??
                'Recorrente')
              : price.recurring
                ? 'Recorrente'
                : 'Pagamento único'
          const title = checkoutPriceLineTitle(price) || price.ref

          return (
            <button
              key={price.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled || soldOut}
              onClick={() => onSelectPrice(price.id)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                isSelected && !soldOut
                  ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/30'
                  : 'border-border/80 bg-background hover:border-primary/45',
                soldOut && 'bg-muted/40 opacity-55'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  isSelected && !soldOut
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40'
                )}
              >
                {isSelected && !soldOut ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                ) : null}
              </span>

              <div
                className={cn(
                  'flex min-w-0 flex-1',
                  isTwoOptions
                    ? 'flex-col justify-between gap-2'
                    : 'items-center justify-between gap-3'
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-medium leading-snug text-foreground wrap-break-word">
                    {title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{recurrence}</span>
                    {stock ? (
                      <Badge
                        variant={
                          stock.soldOut ? 'destructive' : stock.urgent ? 'secondary' : 'outline'
                        }
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {stock.label}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <span className="shrink-0 text-base font-bold tracking-tight text-foreground tabular-nums">
                  {formatMoney(price.amount, price.currency)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
