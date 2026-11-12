'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Input } from '@/components/ui/input'

import { CONTENT } from '../content'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

function SummaryRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/45 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <span className="min-w-0 shrink-0 text-xs leading-snug text-muted-foreground sm:max-w-[52%]">
        {label}
      </span>
      <div className="min-w-0 text-right sm:max-w-[48%]">
        <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
        {note ? (
          <p className="mt-0.5 text-xs font-normal leading-snug text-muted-foreground sm:text-right">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function PricePricingSection({ index, price, editor }: Props) {
  const {
    getAmountInputValue,
    onAmountInputFocus,
    onAmountInputChange,
    onAmountInputBlur,
    getIntMetaInputValue,
    onIntMetaInputFocus,
    onIntMetaInputChange,
    onIntMetaInputBlur,
    getMetadata,
    formatMoney,
    effectiveListAvista,
    effectiveListParcelado,
  } = editor

  const listBase = price.amount
  const listAv = effectiveListAvista(price)
  const listPar = effectiveListParcelado(price)
  const cashPct = (getMetadata(price).cash_discount ?? 0) as number
  const maxInst = Math.max(1, (getMetadata(price).max_installments ?? 1) as number)
  const pixFinal = cashPct > 0 ? Math.round(listAv * (1 - cashPct / 100)) : listAv
  const showInstallmentBreakdown = maxInst > 1 && listPar > 0
  const tiersAdjustList = listBase > 0 && (listAv !== listBase || listPar !== listBase)
  const sameListAfterTiers = listAv === listPar

  return (
    <AdminAccordionSection
      collapsible={false}
      title={CONTENT.sections.pricing.title}
      description={CONTENT.sections.pricing.description}
    >
      <div className="min-w-0 space-y-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-0">
          <Field className="min-w-0">
            <FieldLabel htmlFor={`price-amount-${index}`}>{CONTENT.fields.amount}</FieldLabel>
            <Input
              id={`price-amount-${index}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={getAmountInputValue(index)}
              onFocus={() => onAmountInputFocus(index)}
              onChange={(e) => onAmountInputChange(index, e.target.value)}
              onBlur={() => onAmountInputBlur(index)}
              placeholder={CONTENT.fields.amountPlaceholder}
              className="min-w-0 font-mono tabular-nums text-base sm:text-sm"
            />
            <FieldDescription className="text-xs leading-relaxed">
              {CONTENT.fields.amountHint}
            </FieldDescription>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`price-cash-discount-${index}`}>
              {CONTENT.fields.cashDiscount}
            </FieldLabel>
            <Input
              id={`price-cash-discount-${index}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={getIntMetaInputValue(
                'cash_discount',
                index,
                (getMetadata(price).cash_discount ?? 0) as number
              )}
              onFocus={() =>
                onIntMetaInputFocus(
                  'cash_discount',
                  index,
                  (getMetadata(price).cash_discount ?? 0) as number
                )
              }
              onChange={(e) => onIntMetaInputChange('cash_discount', index, e.target.value)}
              onBlur={() =>
                onIntMetaInputBlur('cash_discount', index, {
                  min: 0,
                  max: 100,
                  field: 'cash_discount',
                })
              }
              placeholder={CONTENT.fields.cashDiscountPlaceholder}
              className="min-w-0"
            />
            <FieldDescription>{CONTENT.fields.cashDiscountHint}</FieldDescription>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`price-max-installments-${index}`}>
              {CONTENT.fields.maxInstallments}
            </FieldLabel>
            <Input
              id={`price-max-installments-${index}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={getIntMetaInputValue(
                'max_installments',
                index,
                (getMetadata(price).max_installments ?? 1) as number
              )}
              onFocus={() =>
                onIntMetaInputFocus(
                  'max_installments',
                  index,
                  (getMetadata(price).max_installments ?? 1) as number
                )
              }
              onChange={(e) => onIntMetaInputChange('max_installments', index, e.target.value)}
              onBlur={() =>
                onIntMetaInputBlur('max_installments', index, {
                  min: 1,
                  max: 24,
                  field: 'max_installments',
                })
              }
              placeholder={CONTENT.fields.maxInstallmentsPlaceholder}
              className="min-w-0"
            />
            <FieldDescription>{CONTENT.fields.maxInstallmentsHint}</FieldDescription>
          </Field>
        </div>

        {listBase > 0 ? (
          <div className="rounded-lg border border-border/55 bg-muted/15 px-3 py-1 sm:px-4 sm:py-2">
            <p className="border-b border-border/50 py-2.5 text-sm font-semibold text-foreground">
              {CONTENT.fields.pricingSummaryTitle}
            </p>
            <div className="pb-1">
              <SummaryRow
                label={CONTENT.fields.pricingSummaryRegistered}
                value={formatMoney(listBase)}
              />
              {tiersAdjustList ? (
                <>
                  <div className="border-b border-border/45 py-2 text-xs font-medium text-foreground/90">
                    {CONTENT.fields.pricingSummaryAfterTiers}
                  </div>
                  {sameListAfterTiers ? (
                    <SummaryRow
                      label={CONTENT.fields.pricingSummaryListUnified}
                      value={formatMoney(listAv)}
                    />
                  ) : (
                    <>
                      <SummaryRow
                        label={CONTENT.fields.pricingSummaryListAvista}
                        value={formatMoney(listAv)}
                      />
                      <SummaryRow
                        label={CONTENT.fields.pricingSummaryListParcelado}
                        value={formatMoney(listPar)}
                      />
                    </>
                  )}
                </>
              ) : null}
              <SummaryRow
                label={CONTENT.fields.pricingSummaryPix}
                value={formatMoney(pixFinal)}
                note={
                  cashPct > 0
                    ? CONTENT.fields.pricingSummaryPixNote.replace('{n}', String(cashPct))
                    : undefined
                }
              />
              {showInstallmentBreakdown ? (
                <SummaryRow
                  label={CONTENT.fields.pricingSummaryCard}
                  value={CONTENT.fields.pricingSummaryCardLine
                    .replace('{n}', String(maxInst))
                    .replace('{valor}', formatMoney(Math.round(listPar / maxInst)))}
                  note={CONTENT.fields.pricingSummaryCardNote}
                />
              ) : (
                <SummaryRow
                  label={CONTENT.fields.pricingSummaryCard}
                  value={formatMoney(listPar)}
                  note={CONTENT.fields.pricingSummaryCardOneX}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AdminAccordionSection>
  )
}
