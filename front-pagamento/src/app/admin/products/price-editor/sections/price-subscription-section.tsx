'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { CONTENT } from '../content'
import { TextIntInput } from '../text-int-input'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceSubscriptionSection({ index, price, editor }: Props) {
  const { updatePrice } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.subscription.title}
      description={CONTENT.sections.subscription.description}
    >
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`price-recurring-${index}`}
          checked={price.recurring}
          onCheckedChange={(checked) =>
            updatePrice(index, {
              recurring: checked as boolean,
              interval: checked ? 'month' : null,
            })
          }
        />
        <FieldLabel
          htmlFor={`price-recurring-${index}`}
          className="text-sm font-medium cursor-pointer"
        >
          {CONTENT.fields.recurring}
        </FieldLabel>
      </div>
      {price.recurring && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0 pt-1">
          <Field>
            <FieldLabel htmlFor={`price-interval-count-${index}`}>
              {CONTENT.fields.intervalCount}
            </FieldLabel>
            <TextIntInput
              id={`price-interval-count-${index}`}
              value={price.interval_count || 1}
              min={1}
              max={999}
              onCommit={(v) => updatePrice(index, { interval_count: v })}
              className="min-w-0"
            />
            <FieldDescription>{CONTENT.fields.intervalCountHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`price-interval-${index}`}>{CONTENT.fields.interval}</FieldLabel>
            <Select
              value={price.interval || 'month'}
              onValueChange={(value) => updatePrice(index, { interval: value })}
            >
              <SelectTrigger id={`price-interval-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTENT.intervals).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}
    </AdminAccordionSection>
  )
}
