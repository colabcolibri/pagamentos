'use client'

import type { ReactNode } from 'react'

import { Plus, Trash2 } from 'lucide-react'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { CONTENT } from '../content'
import { endsAtToLocalValue, localValueToEndsAt } from '../promo-datetime'
import { TextIntInput, TextOptionalPositiveIntInput, TextPercentIntInput } from '../text-int-input'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

function TierBlockTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

const selectTriggerWideClass =
  'w-full min-w-0 max-w-full !h-auto min-h-10 items-start whitespace-normal py-2.5 text-left [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal'

export function PricePromoTiersSection({ index, price, editor }: Props) {
  const { addPromoTier, updatePromoTier, removePromoTier } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.promoTiers.title}
      description={CONTENT.sections.promoTiers.description}
    >
      <div className="space-y-5 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{CONTENT.fields.promoTiers}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {CONTENT.fields.promoTiersListHint}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 self-start sm:self-center"
            onClick={() => addPromoTier(index)}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" aria-hidden />
            {CONTENT.fields.addPromoTier}
          </Button>
        </div>

        {(price.promo_tiers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nenhuma faixa. O checkout usa só o preço cheio e o desconto à vista ou cupom.
          </p>
        ) : (
          <ul className="flex min-w-0 flex-col gap-4">
            {(price.promo_tiers ?? []).map((tier, tierIndex) => (
              <li
                key={tier.id ?? tierIndex}
                className="min-w-0 space-y-6 rounded-lg border border-border/55 bg-muted/25 p-4 sm:p-5"
              >
                <div className="space-y-3">
                  <TierBlockTitle>{CONTENT.fields.promoTierBlockSort}</TierBlockTitle>
                  <p className="text-xs text-muted-foreground -mt-1">
                    {CONTENT.fields.promoTierBlockSortHint}
                  </p>
                  <div className="flex flex-wrap gap-4 sm:gap-6">
                    <Field className="min-w-[5.5rem] w-[6.5rem] shrink-0">
                      <FieldLabel>{CONTENT.fields.promoSort}</FieldLabel>
                      <TextIntInput
                        value={tier.sort_order}
                        min={0}
                        max={9999}
                        onCommit={(v) => updatePromoTier(index, tierIndex, { sort_order: v })}
                        className="min-w-0"
                      />
                    </Field>
                    <Field className="min-w-[5.5rem] w-[6.5rem] shrink-0">
                      <FieldLabel>{CONTENT.fields.promoPercent}</FieldLabel>
                      <TextPercentIntInput
                        value={tier.discount_percent}
                        min={0}
                        max={100}
                        onCommit={(v) => updatePromoTier(index, tierIndex, { discount_percent: v })}
                        className="min-w-0"
                      />
                    </Field>
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/50 pt-5">
                  <TierBlockTitle>{CONTENT.fields.promoTierBlockDeadline}</TierBlockTitle>
                  <p className="text-xs text-muted-foreground -mt-1">
                    {CONTENT.fields.promoTierBlockDeadlineHint}
                  </p>
                  <Field className="max-w-full sm:max-w-md">
                    <FieldLabel>{CONTENT.fields.promoEnds}</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={endsAtToLocalValue(tier.ends_at)}
                      onChange={(e) =>
                        updatePromoTier(index, tierIndex, {
                          ends_at: localValueToEndsAt(e.target.value),
                        })
                      }
                      className="min-w-0 w-full font-mono text-sm tabular-nums"
                    />
                  </Field>
                </div>

                <div className="space-y-3 border-t border-border/50 pt-5">
                  <TierBlockTitle>{CONTENT.fields.promoTierBlockPayment}</TierBlockTitle>
                  <Field>
                    <FieldLabel>{CONTENT.fields.promoAppliesTo}</FieldLabel>
                    <Select
                      value={tier.applies_to ?? 'both'}
                      onValueChange={(v) =>
                        updatePromoTier(index, tierIndex, {
                          applies_to: v as 'avista' | 'parcelado' | 'both',
                        })
                      }
                    >
                      <SelectTrigger className={cn(selectTriggerWideClass)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">{CONTENT.fields.promoAppliesBoth}</SelectItem>
                        <SelectItem value="avista">{CONTENT.fields.promoAppliesAvista}</SelectItem>
                        <SelectItem value="parcelado">
                          {CONTENT.fields.promoAppliesParcelado}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription className="text-xs leading-relaxed max-w-prose">
                      {CONTENT.fields.promoAppliesToHint}
                    </FieldDescription>
                  </Field>
                </div>

                <div className="space-y-3 border-t border-border/50 pt-5">
                  <TierBlockTitle>{CONTENT.fields.promoTierBlockCap}</TierBlockTitle>
                  <Field className="w-full max-w-[14rem]">
                    <FieldLabel>{CONTENT.fields.promoMaxUnits}</FieldLabel>
                    <TextOptionalPositiveIntInput
                      value={tier.max_units ?? null}
                      onCommit={(v) => updatePromoTier(index, tierIndex, { max_units: v })}
                      placeholder="—"
                      className="min-w-0"
                    />
                    <FieldDescription className="text-xs leading-relaxed">
                      {CONTENT.fields.promoMaxUnitsHint}
                    </FieldDescription>
                  </Field>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {CONTENT.fields.promoUnitsSold}:{' '}
                    <span className="font-semibold tabular-nums text-foreground">
                      {tier.units_sold ?? 0}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive shrink-0 self-start sm:self-auto -mx-2 sm:mx-0"
                    onClick={() => removePromoTier(index, tierIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" aria-hidden />
                    {CONTENT.fields.removePromoTier}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminAccordionSection>
  )
}
