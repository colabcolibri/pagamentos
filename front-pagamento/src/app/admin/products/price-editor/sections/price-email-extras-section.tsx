'use client'

import { Plus, Trash2 } from 'lucide-react'

import { AdminAccordionSection } from '@/components/layout/ui/admin-accordion-section'
import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
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

export function PriceEmailExtrasSection({ index, price, editor }: Props) {
  const {
    getEmailAddon,
    setOrderCreatedEmailField,
    setPaymentConfirmedEmailField,
    getPaymentNextSteps,
    setPaymentNextSteps,
  } = editor

  return (
    <AdminAccordionSection
      title={CONTENT.sections.emailExtras.title}
      description={CONTENT.sections.emailExtras.description}
    >
      <div className="space-y-4">
        <AdminAccordionSection
          variant="nested"
          title={CONTENT.sections.emailOrderCreated.title}
          description={CONTENT.sections.emailOrderCreated.description}
        >
          <Field>
            <FieldLabel htmlFor={`price-email-oc-msg-${index}`}>
              {CONTENT.emailAddon.orderCreatedMessage}
            </FieldLabel>
            <Textarea
              id={`price-email-oc-msg-${index}`}
              rows={2}
              value={getEmailAddon(price).order_created?.custom_message ?? ''}
              onChange={(e) => setOrderCreatedEmailField(index, 'custom_message', e.target.value)}
              placeholder={CONTENT.emailAddon.orderCreatedMessagePlaceholder}
              className="resize-y min-h-12 max-w-full"
            />
            <FieldDescription>{CONTENT.emailAddon.orderCreatedMessageHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`price-email-oc-inst-${index}`}>
              {CONTENT.emailAddon.orderCreatedInstructions}
            </FieldLabel>
            <Textarea
              id={`price-email-oc-inst-${index}`}
              rows={2}
              value={getEmailAddon(price).order_created?.instructions ?? ''}
              onChange={(e) => setOrderCreatedEmailField(index, 'instructions', e.target.value)}
              placeholder={CONTENT.emailAddon.orderCreatedInstructionsPlaceholder}
              className="resize-y min-h-12 max-w-full"
            />
          </Field>
        </AdminAccordionSection>
        <AdminAccordionSection
          variant="nested"
          title={CONTENT.sections.emailPaymentDone.title}
          description={CONTENT.sections.emailPaymentDone.description}
        >
          <Field>
            <FieldLabel htmlFor={`price-email-pc-msg-${index}`}>
              {CONTENT.emailAddon.paymentMessage}
            </FieldLabel>
            <Textarea
              id={`price-email-pc-msg-${index}`}
              rows={2}
              value={getEmailAddon(price).payment_confirmed?.custom_message ?? ''}
              onChange={(e) =>
                setPaymentConfirmedEmailField(index, 'custom_message', e.target.value)
              }
              placeholder={CONTENT.emailAddon.paymentMessagePlaceholder}
              className="resize-y min-h-12 max-w-full"
            />
            <FieldDescription>{CONTENT.emailAddon.paymentMessageHint}</FieldDescription>
          </Field>
          <div className="space-y-2 min-w-0">
            <FieldLabel className="text-xs sm:text-sm">
              {CONTENT.emailAddon.paymentNextSteps}
            </FieldLabel>
            <FieldDescription className="text-xs">
              {CONTENT.emailAddon.paymentNextStepsHint}
            </FieldDescription>
            {getPaymentNextSteps(price).map((step, stepIdx) => (
              <div key={stepIdx} className="flex gap-2 min-w-0">
                <Input
                  value={step}
                  onChange={(e) => {
                    const next = [...getPaymentNextSteps(price)]
                    next[stepIdx] = e.target.value
                    setPaymentNextSteps(index, next)
                  }}
                  placeholder={CONTENT.emailAddon.nextStepPlaceholder}
                  className="text-xs sm:text-sm min-w-0 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => {
                    const next = getPaymentNextSteps(price).filter((_, i) => i !== stepIdx)
                    setPaymentNextSteps(index, next)
                  }}
                  title={CONTENT.actions.remove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs w-full sm:w-auto"
              onClick={() => setPaymentNextSteps(index, [...getPaymentNextSteps(price), ''])}
            >
              <Plus className="h-3 w-3 mr-1" />
              {CONTENT.emailAddon.addStep}
            </Button>
          </div>
        </AdminAccordionSection>
      </div>
    </AdminAccordionSection>
  )
}
