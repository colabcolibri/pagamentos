'use client'

import { Plus } from 'lucide-react'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { CONTENT } from '../content'
import type { Price } from '../types'
import type { UsePricesEditorReturn } from '../use-prices-editor'

type Props = {
  index: number
  price: Price
  editor: UsePricesEditorReturn
}

export function PriceTopicsSection({ index, price, editor }: Props) {
  const { getTopics, addTopicSection, updateTopicSection, removeTopicSection } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.checkoutPage.title}
      description={CONTENT.sections.checkoutPage.description}
    >
      {getTopics(price).length === 0 ? (
        <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3 bg-muted/20">
          {CONTENT.topics.empty} &quot;{CONTENT.topics.addSection}&quot;{' '}
          {CONTENT.topics.emptyAction}
        </div>
      ) : null}
      {getTopics(price).map((section, secIdx) => (
        <div key={secIdx} className="rounded-lg border bg-muted/25 p-3 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <FieldLabel className="text-xs">
              {CONTENT.topics.sectionTitle} {secIdx + 1}
            </FieldLabel>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeTopicSection(index, secIdx)}
              className="text-destructive hover:text-destructive h-7 px-2 text-xs shrink-0"
            >
              {CONTENT.topics.removeSection}
            </Button>
          </div>
          <Input
            value={section.title}
            onChange={(e) => updateTopicSection(index, secIdx, { title: e.target.value })}
            placeholder={CONTENT.topics.sectionTitlePlaceholder}
            className="text-xs sm:text-sm"
          />
          <Textarea
            value={section.content.join('\n')}
            onChange={(e) =>
              updateTopicSection(index, secIdx, {
                // Não filtrar linhas vazias durante a edição: senão Enter some na hora.
                content: e.target.value.split('\n'),
              })
            }
            placeholder={CONTENT.topics.sectionContentPlaceholder}
            rows={3}
            className="text-xs sm:text-sm resize-y min-h-16"
          />
          <FieldDescription className="text-[10px] sm:text-xs">
            {CONTENT.topics.sectionContent}
          </FieldDescription>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => addTopicSection(index)}
        className="text-xs w-full sm:w-auto"
      >
        <Plus className="h-3 w-3 mr-1" />
        {CONTENT.topics.addSection}
      </Button>
    </AdminAccordionSection>
  )
}
