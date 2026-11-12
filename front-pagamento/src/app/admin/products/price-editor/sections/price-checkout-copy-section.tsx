'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Textarea } from '@/components/ui/textarea'

import { CONTENT } from '../content'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceCheckoutCopySection({ index, price, editor }: Props) {
  const { getMetadata, setMetadataStringField } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.checkoutCopy.title}
      description={CONTENT.sections.checkoutCopy.description}
    >
      <Field>
        <FieldLabel htmlFor={`price-success-message-${index}`}>
          {CONTENT.fields.successMessage}
        </FieldLabel>
        <Textarea
          id={`price-success-message-${index}`}
          rows={2}
          value={(getMetadata(price).success_message as string) ?? ''}
          onChange={(e) => setMetadataStringField(index, 'success_message', e.target.value)}
          placeholder={CONTENT.fields.successMessagePlaceholder}
          className="resize-y min-h-12 max-w-full"
        />
        <FieldDescription>{CONTENT.fields.successMessageHint}</FieldDescription>
      </Field>
    </AdminAccordionSection>
  )
}
