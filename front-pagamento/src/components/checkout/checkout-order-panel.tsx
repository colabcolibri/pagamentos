'use client'

import type { PricePromoPublicDisplay } from '@quitou/core/pricing'

import type { CheckoutPromoSummaryLabels } from '@/components/checkout/checkout-promo-labels'
import { CheckoutPromoStockSection } from '@/components/checkout/checkout-promo-offer'
import type { PriceTopicSection } from '@/components/price-topics/types'
import { pricePlanTitle } from '@/lib/checkout/offer-display'
import type { Price } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

type Copy = {
  priceLabel: string
  whatIncluded: string
  totalLabel: string
  extrasSubtotal: string
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function CheckoutOrderPanel({
  productName,
  productDescription,
  selectedPrice,
  priceCurrency,
  priceUi,
  checkoutPromoLabels,
  formattedPrice,
  installmentsSummaryLine,
  mainLineCents,
  selectedAddonsExtraCents,
  topicSections,
  copy,
  className,
}: {
  productName: string
  productDescription: string | null | undefined
  selectedPrice: Price | undefined
  priceCurrency: string
  priceUi: PricePromoPublicDisplay | null
  checkoutPromoLabels: CheckoutPromoSummaryLabels
  formattedPrice: string
  installmentsSummaryLine: string | null
  /** Valor do plano atual no fluxo (à vista / parcelado), para total sem promo UI. */
  mainLineCents: number | null
  selectedAddonsExtraCents: number
  topicSections: PriceTopicSection[]
  copy: Copy
  className?: string
}) {
  const planTitle = pricePlanTitle(selectedPrice)
  const grandSimple = mainLineCents != null ? mainLineCents + selectedAddonsExtraCents : null

  return (
    <aside
      className={cn(
        'min-w-0 rounded-xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm',
        className
      )}
      aria-label="Resumo do pedido"
    >
      <div className="space-y-5 p-4 sm:p-5">
        <header className="min-w-0 space-y-1 border-b border-border/50 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground wrap-break-word">
            {productName}
          </p>
          {planTitle ? (
            <h2 className="text-lg font-semibold leading-snug text-foreground wrap-break-word sm:text-xl">
              {planTitle}
            </h2>
          ) : (
            <h2 className="text-lg font-semibold leading-snug text-foreground wrap-break-word sm:text-xl">
              {productName}
            </h2>
          )}
          {productDescription ? (
            <p className="text-sm leading-relaxed text-muted-foreground wrap-break-word">
              {productDescription}
            </p>
          ) : null}
        </header>

        {/* Com UI de promo: preço fica na coluna ao lado; aqui só estoque (+ linha de opcionais se houver). */}
        {priceUi ? (
          <div
            className="min-w-0 rounded-lg border border-border/60 bg-muted/15 p-3 sm:p-4"
            role="region"
            aria-label={checkoutPromoLabels.stock}
          >
            <div className="min-w-0 space-y-3">
              <CheckoutPromoStockSection display={priceUi} labels={checkoutPromoLabels} />
              {selectedAddonsExtraCents > 0 ? (
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/50 pt-3 text-sm tabular-nums">
                  <span className="text-muted-foreground">{copy.extrasSubtotal}</span>
                  <span className="font-semibold text-foreground">
                    + {formatMoney(selectedAddonsExtraCents, priceCurrency)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className="min-w-0 rounded-lg border border-border/60 bg-muted/15 p-3 sm:p-4"
            role="region"
            aria-label={copy.priceLabel}
          >
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.priceLabel}
              </p>
              <p className="text-xl font-bold tabular-nums text-primary wrap-break-word sm:text-2xl">
                {formattedPrice}
              </p>
              {installmentsSummaryLine ? (
                <p className="text-sm font-medium tabular-nums text-foreground wrap-break-word text-pretty">
                  {installmentsSummaryLine}
                </p>
              ) : null}
              {selectedAddonsExtraCents > 0 && mainLineCents != null ? (
                <dl className="mt-3 space-y-1.5 border-t border-border/50 pt-3 text-sm">
                  <div className="flex justify-between gap-3 tabular-nums">
                    <dt className="text-muted-foreground">{copy.extrasSubtotal}</dt>
                    <dd>{formatMoney(selectedAddonsExtraCents, priceCurrency)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border/50 pt-2 text-base font-semibold tabular-nums text-primary">
                    <dt>{copy.totalLabel}</dt>
                    <dd>{formatMoney(grandSimple ?? 0, priceCurrency)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>
        )}

        {topicSections.length > 0 ? (
          <div className="space-y-4 border-t border-border/40 pt-4">
            {topicSections.map((section, idx) => {
              const heading = section.title?.trim() || copy.whatIncluded
              return (
                <div key={idx} className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-foreground wrap-break-word">{heading}</p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    {section.content
                      .filter((item) => item.trim() !== '')
                      .map((item, i) => (
                        <li key={i} className="wrap-break-word">
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
