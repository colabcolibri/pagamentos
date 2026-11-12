'use client'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import { CONTENT } from '../content'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceIdentifySection({ index, price, editor }: Props) {
  const { updatePrice, getMetadata, prices } = editor
  const activeId = `price-active-${index}`

  return (
    <AdminAccordionSection
      collapsible={false}
      title={CONTENT.sections.identify.title}
      description={CONTENT.sections.identify.description}
    >
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:grid-cols-12 sm:gap-x-4 sm:gap-y-3">
        <Field className="min-w-0 sm:col-span-5">
          <FieldLabel htmlFor={`price-title-${index}`}>{CONTENT.fields.title}</FieldLabel>
          <Input
            id={`price-title-${index}`}
            value={getMetadata(price).title ?? ''}
            onChange={(e) => {
              const next = {
                ...getMetadata(prices[index]),
                title: e.target.value || undefined,
              }
              updatePrice(index, { metadata: next })
            }}
            placeholder={CONTENT.fields.titlePlaceholder}
            className="min-w-0"
          />
          <FieldDescription>{CONTENT.fields.titleHint}</FieldDescription>
        </Field>
        <Field className="min-w-0 sm:col-span-5">
          <FieldLabel htmlFor={`price-ref-${index}`}>{CONTENT.fields.ref}</FieldLabel>
          <Input
            id={`price-ref-${index}`}
            value={price.ref || ''}
            onChange={(e) => updatePrice(index, { ref: e.target.value })}
            placeholder={CONTENT.fields.refPlaceholder}
            className="min-w-0 font-mono text-sm"
          />
          <FieldDescription>{CONTENT.fields.refHint}</FieldDescription>
        </Field>
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 sm:justify-self-stretch">
          <span className="text-xs font-medium text-muted-foreground">{CONTENT.fields.active}</span>
          <div className="flex min-h-10 items-center gap-2.5">
            <Switch
              id={activeId}
              checked={price.active}
              onCheckedChange={(checked) => updatePrice(index, { active: checked })}
              title={CONTENT.fields.activeHint}
              aria-label={CONTENT.fields.active}
            />
            <Label htmlFor={activeId} className="cursor-pointer text-sm font-normal leading-snug">
              {price.active ? 'Visível no checkout' : 'Oculto'}
            </Label>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground sm:hidden">
            {CONTENT.fields.activeHint}
          </p>
        </div>
      </div>
    </AdminAccordionSection>
  )
}
