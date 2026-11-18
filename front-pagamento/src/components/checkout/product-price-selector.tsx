'use client'

import { Check, Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <div className="mb-6 space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Package className="h-4 w-4 text-primary" />
        <span>Escolha a opção desejada</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              disabled={disabled || soldOut}
              onClick={() => onSelectPrice(price.id)}
              className="text-left focus:outline-none disabled:cursor-not-allowed"
            >
              <Card
                className={cn(
                  'h-full transition-all',
                  isSelected && !soldOut
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]'
                    : 'hover:border-primary/50',
                  soldOut && 'opacity-55 bg-muted/40'
                )}
              >
                <CardContent className="flex h-full flex-col justify-between gap-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium text-sm text-foreground leading-snug wrap-break-word">
                        {title}
                      </div>
                      <div className="text-xs text-muted-foreground">{recurrence}</div>
                    </div>
                    {isSelected && !soldOut && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-lg font-bold tracking-tight text-foreground tabular-nums">
                      {formatMoney(price.amount, price.currency)}
                    </span>
                    {stock && (
                      <Badge
                        variant={
                          stock.soldOut ? 'destructive' : stock.urgent ? 'secondary' : 'outline'
                        }
                      >
                        {stock.label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
