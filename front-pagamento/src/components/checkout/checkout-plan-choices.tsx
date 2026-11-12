'use client'

import { Check, ChevronDown, Flame, Package, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { estimateAddonCents } from '@/lib/checkout/addon-estimate'
import {
  addonOfferHasExpandableDetails,
  getAddonOfferDisplay,
} from '@/lib/checkout/addon-offer-display'
import { checkoutPriceLineTitle } from '@/lib/checkout/offer-display'
import type { Price, PriceAddonOffer, PriceUpgradePath } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

export type CheckoutPlanChoicesCopy = {
  currentPlan: string
  changePlan: string
  upgradeTagline: string
  upgradeHelp: string
  upgradeCatalogHint: string
  upgradeDiffMoreSuffix: string
  upgradeDiffLessSuffix: string
  upgradeDiffSame: string
  selectPlan: string
  revertPlan: string
  addonTitle: string
  addonUnavailable: string
  viewDetails: string
}

/** Formata valor com decimais só se necessário: 180 → "R$ 180", 180.50 → "R$ 180,50" */
function formatMoney(cents: number, currency: string): string {
  const value = cents / 100
  const hasDecimals = value % 1 !== 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value)
}

/** Calcula unidades restantes e retorna o nível de urgência para exibição. */
function stockUrgency(
  stockCap: number | null | undefined,
  stockSold: number | null | undefined
): { level: 'notice' | 'urgent' | 'critical'; remaining: number } | null {
  if (stockCap == null || stockCap <= 0) return null
  const sold = stockSold ?? 0
  const remaining = stockCap - sold
  if (remaining <= 0) return null
  if (remaining <= 5) return { level: 'critical', remaining }
  if (remaining <= 15) return { level: 'urgent', remaining }
  if (remaining <= 50) return { level: 'notice', remaining }
  return null
}

function StockBadge({
  stockCap,
  stockSold,
  unit,
}: {
  stockCap?: number | null
  stockSold?: number
  unit?: string | null
}) {
  const urgency = stockUrgency(stockCap, stockSold)
  if (!urgency) return null
  const noun = unit?.trim() || 'unidades'
  if (urgency.level === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
        <Flame className="h-3 w-3 shrink-0" aria-hidden />
        Últimas {urgency.remaining} {noun}
      </span>
    )
  }
  if (urgency.level === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
        <Flame className="h-3 w-3 shrink-0" aria-hidden />
        Últimas {urgency.remaining} {noun}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {urgency.remaining} {noun} disponíveis
    </span>
  )
}

/** Retorna { sign, amount } para montar o badge de diferença de preço. */
function priceDiff(
  fromCents: number,
  toCents: number,
  currency: string
): { sign: '+' | '-' | '='; label: string } | null {
  if (!Number.isFinite(fromCents) || !Number.isFinite(toCents)) return null
  const d = Math.round(toCents) - Math.round(fromCents)
  if (d === 0) return { sign: '=', label: 'mesmo valor' }
  if (d > 0) return { sign: '+', label: formatMoney(d, currency) }
  return { sign: '-', label: formatMoney(-d, currency) }
}

/** Nomes dos opcionais ofertados para o aria-label da seção. */
function addonOfferNamesLine(offers: PriceAddonOffer[], anchorProductName: string): string {
  const titles = offers
    .map((o) => getAddonOfferDisplay(o, anchorProductName).title.trim())
    .filter((t) => t.length > 0)
  if (titles.length === 0) return ''
  if (titles.length === 1) return titles[0]!
  if (titles.length === 2) return `${titles[0]!} · ${titles[1]!}`
  return `${titles[0]!} · ${titles[1]!} +${titles.length - 2}`
}

export interface CheckoutPlanChoicesProps {
  anchorProductName: string
  selectedPrice: Price | undefined
  /** Price ID com o qual o usuário chegou na página — permite voltar caso tenha trocado. */
  originalPriceId: string
  priceCurrency: string
  checkoutFlowUi: 'avista' | 'parcelado'
  upgradeTargets: PriceUpgradePath[]
  onSelectPlanPriceId: (priceId: string) => void
  addonOffers: PriceAddonOffer[]
  showAddonSection: boolean
  selectedAddonIds: string[]
  toggleAddon: (addonPriceId: string) => void
  copy: CheckoutPlanChoicesCopy
  disabled?: boolean
  className?: string
}

function AddonOfferRow({
  offer,
  anchorProductName,
  checkoutFlowUi,
  priceCurrency,
  selected,
  toggleAddon,
  disabled,
  copy,
}: {
  offer: PriceAddonOffer
  anchorProductName: string
  checkoutFlowUi: 'avista' | 'parcelado'
  priceCurrency: string
  selected: boolean
  toggleAddon: (id: string) => void
  disabled: boolean
  copy: CheckoutPlanChoicesCopy
}) {
  const display = getAddonOfferDisplay(offer, anchorProductName)
  const ap = offer.addon_price
  const cents = ap ? estimateAddonCents(ap, checkoutFlowUi) : null
  const formatted = cents != null ? formatMoney(cents, priceCurrency) : null
  const isDisabled = disabled || cents == null
  const expandable = addonOfferHasExpandableDetails(display)
  const showSubtitleInline = Boolean(display.subtitle) && !expandable
  const checkboxId = `addon-checkout-${offer.addon_price_id}`

  return (
    <li
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-xl border-2 p-4 transition-all duration-150',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/50 bg-card hover:border-border',
        isDisabled && 'pointer-events-none opacity-40'
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={selected}
        onCheckedChange={() => toggleAddon(offer.addon_price_id)}
        disabled={isDisabled}
        className="mt-0.5 size-5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <Label htmlFor={checkboxId} className="block min-w-0 cursor-pointer font-normal">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="block text-[15px] font-semibold leading-snug text-foreground wrap-break-word">
                {display.title}
              </span>
              {showSubtitleInline ? (
                <span className="block text-sm leading-relaxed text-muted-foreground wrap-break-word">
                  {display.subtitle}
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              {formatted ? (
                <span
                  className={cn(
                    'inline-block rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  + {formatted}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{copy.addonUnavailable}</span>
              )}
            </div>
          </div>
        </Label>

        {expandable ? (
          <Collapsible className="mt-3 min-w-0 [&[data-state=open]_.addon-chev]:rotate-180">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <CollapsibleTrigger
                type="button"
                className="flex items-center gap-1.5 text-left text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown
                  className="addon-chev h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                  aria-hidden
                />
                {copy.viewDetails}
              </CollapsibleTrigger>
              <StockBadge
                stockCap={ap?.stock_cap}
                stockSold={ap?.stock_sold}
                unit={
                  (ap?.metadata as Record<string, unknown> | null)?.checkout_stock_label as
                    | string
                    | null
                }
              />
            </div>
            <CollapsibleContent className="min-w-0 overflow-hidden">
              <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
                {display.fullDescription ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground wrap-break-word">
                    {display.fullDescription}
                  </p>
                ) : null}
                {display.topics.map((section, idx) => {
                  const items = section.content.filter((item) => item.trim() !== '')
                  if (items.length === 0) return null
                  return (
                    <div key={`${section.title}-${idx}`} className="min-w-0 space-y-1.5">
                      <p className="text-xs font-semibold text-foreground wrap-break-word">
                        {section.title.trim() || 'Incluso'}
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 pl-0.5 text-xs leading-relaxed text-muted-foreground">
                        {items.map((item, i) => (
                          <li key={i} className="wrap-break-word">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="mt-1.5 flex justify-end">
            <StockBadge
              stockCap={ap?.stock_cap}
              stockSold={ap?.stock_sold}
              unit={
                (ap?.metadata as Record<string, unknown> | null)?.checkout_stock_label as
                  | string
                  | null
              }
            />
          </div>
        )}
      </div>
    </li>
  )
}

export function CheckoutPlanChoices({
  anchorProductName,
  selectedPrice,
  originalPriceId,
  priceCurrency,
  checkoutFlowUi,
  upgradeTargets,
  onSelectPlanPriceId,
  addonOffers,
  showAddonSection,
  selectedAddonIds,
  toggleAddon,
  copy,
  disabled = false,
  className,
}: CheckoutPlanChoicesProps) {
  const showUpgrade = upgradeTargets.length > 0
  const isOnUpgradedPrice = !!selectedPrice && selectedPrice.id !== originalPriceId
  const addonNamesSubtitle = showAddonSection
    ? addonOfferNamesLine(addonOffers, anchorProductName)
    : ''
  const addonSectionAriaLabel =
    addonNamesSubtitle.length > 0 ? `${copy.addonTitle} — ${addonNamesSubtitle}` : copy.addonTitle

  if (!showUpgrade && !showAddonSection) return null

  return (
    <div className={cn('min-w-0 space-y-4', className)}>
      {showUpgrade ? (
        <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-sm">
          {/* Header */}
          <CardHeader className="border-b border-border/50 bg-muted/25 px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">{copy.changePlan}</h3>
            </div>
            {copy.upgradeTagline.trim() ? (
              <p className="mt-1 text-sm leading-snug text-muted-foreground wrap-break-word">
                {copy.upgradeTagline}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-2 px-4 py-3 sm:px-5">
            {/* Nível atual — linha fina de referência */}
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {selectedPrice ? checkoutPriceLineTitle(selectedPrice, '—') : '—'}
              </span>
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {copy.currentPlan}
              </span>
            </div>

            {/* Opções acima — card com destaque */}
            {upgradeTargets.map((path) => {
              const to = path.to_price!
              const title = checkoutPriceLineTitle(to, '—')
              const fromCents =
                selectedPrice && typeof selectedPrice.amount === 'number'
                  ? selectedPrice.amount
                  : NaN
              const toCents = typeof to.amount === 'number' ? to.amount : NaN
              const diff = priceDiff(fromCents, toCents, priceCurrency)

              const stockBadge = (
                <StockBadge
                  stockCap={to.stock_cap}
                  stockSold={to.stock_sold}
                  unit={
                    (to.metadata as Record<string, unknown> | null)?.checkout_stock_label as
                      | string
                      | null
                  }
                />
              )

              return (
                <div
                  key={path.id}
                  className="min-w-0 rounded-xl border-2 border-border/60 bg-card px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Conteúdo */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="block text-[15px] font-semibold leading-snug text-foreground wrap-break-word">
                        {title}
                      </span>
                      {diff ? (
                        <div className="flex items-center gap-2">
                          {diff.sign !== '=' ? (
                            <span
                              className={cn(
                                'rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                                diff.sign === '+'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              )}
                            >
                              {diff.sign}
                              {diff.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {copy.upgradeDiffSame}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectPlanPriceId(to.id)}
                      className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/70 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {copy.selectPlan}
                    </button>
                  </div>
                  {stockBadge && <div className="mt-1.5 flex justify-end">{stockBadge}</div>}
                </div>
              )
            })}

            {/* Voltar ao original */}
            {isOnUpgradedPrice ? (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectPlanPriceId(originalPriceId)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {copy.revertPlan}
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Opcionais */}
      {showAddonSection ? (
        <Card
          className="gap-0 overflow-hidden border-border/70 py-0 shadow-sm"
          aria-label={addonSectionAriaLabel}
        >
          <CardHeader className="border-b border-border/50 bg-muted/25 px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Package
                className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <h3 className="text-sm font-semibold text-foreground">{copy.addonTitle}</h3>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-3 sm:px-5">
            <ul className="min-w-0 space-y-2" role="list">
              {addonOffers.map((offer) => (
                <AddonOfferRow
                  key={offer.id}
                  offer={offer}
                  anchorProductName={anchorProductName}
                  checkoutFlowUi={checkoutFlowUi}
                  priceCurrency={priceCurrency}
                  selected={selectedAddonIds.includes(offer.addon_price_id)}
                  toggleAddon={toggleAddon}
                  disabled={disabled}
                  copy={copy}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
