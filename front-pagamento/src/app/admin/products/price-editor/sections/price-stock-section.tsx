'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Input } from '@/components/ui/input'

import { CONTENT } from '../content'
import { TextOptionalPositiveIntInput } from '../text-int-input'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceStockSection({ index, price, editor }: Props) {
  const { updatePrice, setMetadataStringField } = editor
  const meta = price.metadata ?? {}
  const checkoutLabel = meta.checkout_stock_label ?? ''

  return (
    <AdminAccordionSection
      collapsible={false}
      title={CONTENT.sections.stock.title}
      description={CONTENT.sections.stock.description}
    >
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-8">
        <Field>
          <FieldLabel htmlFor={`price-stock-cap-${index}`}>{CONTENT.fields.stockCap}</FieldLabel>
          <TextOptionalPositiveIntInput
            id={`price-stock-cap-${index}`}
            value={price.stock_cap ?? null}
            onCommit={(v) => updatePrice(index, { stock_cap: v })}
            placeholder={CONTENT.fields.stockCapPlaceholder}
            className="min-w-0"
          />
          <FieldDescription>{CONTENT.fields.stockCapHint}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`price-stock-sold-${index}`}>
            {CONTENT.fields.stockSoldReadonly}
          </FieldLabel>
          <Input
            id={`price-stock-sold-${index}`}
            readOnly
            value={String(price.stock_sold ?? 0)}
            className="min-w-0 bg-muted/50"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`price-checkout-stock-label-${index}`}>
            {CONTENT.fields.checkoutStockLabel}
          </FieldLabel>
          <Input
            id={`price-checkout-stock-label-${index}`}
            value={checkoutLabel}
            onChange={(e) =>
              setMetadataStringField(index, 'checkout_stock_label', e.target.value)
            }
            placeholder={CONTENT.fields.checkoutStockLabelPlaceholder}
            className="min-w-0"
          />
          <FieldDescription>{CONTENT.fields.checkoutStockLabelHint}</FieldDescription>
        </Field>
      </div>
    </AdminAccordionSection>
  )
}
