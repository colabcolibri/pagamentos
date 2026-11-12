'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Checkbox } from '@/components/ui/checkbox'

import { CONTENT } from '../content'
import { TextIntInput } from '../text-int-input'
import type { Price, PriceMetadata } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceAccessSection({ index, price, editor }: Props) {
  const { updatePrice, getMetadata, prices } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.access.title}
      description={CONTENT.sections.access.description}
    >
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`price-lifetime-access-${index}`}
            checked={(() => {
              const meta = getMetadata(price)
              if (meta.lifetime_access === true) return true
              if (meta.access_months === 999) return true
              return meta.lifetime_access !== false && meta.access_months === undefined
            })()}
            onCheckedChange={(checked) => {
              const meta = getMetadata(prices[index])
              const next: PriceMetadata = {
                ...meta,
                lifetime_access: checked === true,
                access_months: checked === true ? undefined : (meta.access_months ?? 12),
              }
              if (next.access_months === 999) next.access_months = 12
              updatePrice(index, { metadata: next })
            }}
          />
          <FieldLabel
            htmlFor={`price-lifetime-access-${index}`}
            className="text-sm font-medium cursor-pointer"
          >
            {CONTENT.fields.lifetimeAccess}
          </FieldLabel>
        </div>
        <FieldDescription>{CONTENT.fields.lifetimeAccessHint}</FieldDescription>
        {!getMetadata(price).lifetime_access && getMetadata(price).access_months !== 999 && (
          <Field>
            <FieldLabel htmlFor={`price-access-months-${index}`}>
              {CONTENT.fields.accessMonths}
            </FieldLabel>
            <TextIntInput
              id={`price-access-months-${index}`}
              value={
                getMetadata(price).access_months === undefined
                  ? 12
                  : Math.min(998, Math.max(1, Number(getMetadata(price).access_months) || 12))
              }
              min={1}
              max={998}
              onCommit={(v) => {
                const meta = getMetadata(prices[index])
                updatePrice(index, { metadata: { ...meta, access_months: v } })
              }}
              className="min-w-0"
            />
            <FieldDescription>{CONTENT.fields.accessMonthsHint}</FieldDescription>
          </Field>
        )}
      </div>
    </AdminAccordionSection>
  )
}
