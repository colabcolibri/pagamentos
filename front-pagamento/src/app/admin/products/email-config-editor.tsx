'use client'

import { useState } from 'react'

import { Minus, Plus, Trash2 } from 'lucide-react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CONTENT = {
  sections: {
    orderCreated: {
      title: 'Email de pedido criado',
      description: 'Enviado quando o pedido é criado e aguarda pagamento (PIX/Boleto)',
    },
    paymentConfirmed: {
      title: 'Email de pagamento confirmado',
      description: 'Enviado quando o pagamento é confirmado com sucesso',
    },
  },
  fields: {
    fromName: 'Nome do remetente',
    fromNamePlaceholder: 'Ex: Oficina Norte',
    fromEmail: 'Email do remetente',
    fromEmailPlaceholder: 'Ex: naoresponda@exemplo.com',
    replyTo: 'Email para resposta',
    replyToPlaceholder: 'Ex: loja@exemplo.com',
    replyToHint: 'Email que receberá as respostas dos clientes (opcional)',
    cc: 'CC (Cópia)',
    ccPlaceholder: 'Ex: loja@exemplo.com, suporte@exemplo.com',
    ccHint: 'Emails que receberão cópia de cada email enviado (opcional, separados por vírgula)',
    subject: 'Assunto do email',
    subjectPlaceholder: 'Ex: Pedido criado com sucesso!',
    customMessage: 'Mensagem personalizada',
    customMessagePlaceholder: 'Mensagem adicional para o cliente...',
    customMessageHint: 'Texto personalizado que aparece no corpo do email (opcional)',
    instructions: 'Instruções de pagamento',
    instructionsPlaceholder: 'Ex.: Após o pagamento, você receberá o acesso',
    instructionsHint: 'Opcional. Lista numerada: use próximos passos abaixo.',
    includeNextSteps: 'Incluir próximos passos',
    includeNextStepsHint: 'Mostra uma lista de ações para o cliente',
    nextSteps: 'Próximos passos',
    nextStepPlaceholder: 'Ex: Acesse sua conta no site',
    addStep: 'Adicionar passo',
  },
} as const

export interface EmailConfig {
  from_name: string
  from_email: string
  reply_to?: string
  cc?: string // String com emails separados por vírgula
  subject: string
  custom_message?: string
  instructions?: string
  include_next_steps?: boolean
  next_steps?: string[]
}

export interface ProductEmailConfig {
  order_created?: EmailConfig
  payment_confirmed?: EmailConfig
}

interface EmailConfigEditorProps {
  value: ProductEmailConfig | null
  onChange: (value: ProductEmailConfig) => void
}

export function EmailConfigEditor({ value, onChange }: EmailConfigEditorProps) {
  const [config, setConfig] = useState<ProductEmailConfig>(
    value || {
      order_created: {
        from_name: 'Quitou',
        from_email: 'naoresponda@exemplo.com',
        subject: 'Pedido criado com sucesso!',
        include_next_steps: false,
        next_steps: [],
      },
      payment_confirmed: {
        from_name: 'Quitou',
        from_email: 'naoresponda@exemplo.com',
        subject: 'Pagamento confirmado!',
        include_next_steps: true,
        next_steps: ['Acesse sua conta', 'Confira o material', 'Entre em contato se tiver dúvidas'],
      },
    }
  )

  // Estado de collapse para cada seção
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    order_created: false,
    payment_confirmed: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updateConfig = (
    type: 'order_created' | 'payment_confirmed',
    updates: Partial<EmailConfig>
  ) => {
    const newConfig = {
      ...config,
      [type]: {
        ...config[type],
        ...updates,
      },
    }
    setConfig(newConfig)
    onChange(newConfig)
  }

  const addNextStep = (type: 'order_created' | 'payment_confirmed') => {
    const currentSteps = config[type]?.next_steps || []
    updateConfig(type, {
      next_steps: [...currentSteps, ''],
    })
  }

  const updateNextStep = (
    type: 'order_created' | 'payment_confirmed',
    index: number,
    value: string
  ) => {
    const currentSteps = [...(config[type]?.next_steps || [])]
    currentSteps[index] = value
    updateConfig(type, { next_steps: currentSteps })
  }

  const removeNextStep = (type: 'order_created' | 'payment_confirmed', index: number) => {
    const currentSteps = [...(config[type]?.next_steps || [])]
    currentSteps.splice(index, 1)
    updateConfig(type, { next_steps: currentSteps })
  }

  const renderEmailSection = (
    type: 'order_created' | 'payment_confirmed',
    title: string,
    description: string
  ) => {
    const emailConfig = (config[type] || {}) as EmailConfig
    const isOpen = openSections[type]

    return (
      <Collapsible key={type} open={isOpen} onOpenChange={() => toggleSection(type)}>
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/40">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold wrap-break-word">{title}</h3>
                <p className="text-sm text-muted-foreground wrap-break-word">{description}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" type="button">
                {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-4 border-t border-border/60 bg-muted/10 p-4 sm:p-5">
              {/* From Name */}
              <Field>
                <FieldLabel htmlFor={`${type}-from-name`}>{CONTENT.fields.fromName} *</FieldLabel>
                <Input
                  id={`${type}-from-name`}
                  value={emailConfig.from_name || ''}
                  onChange={(e) => updateConfig(type, { from_name: e.target.value })}
                  placeholder={CONTENT.fields.fromNamePlaceholder}
                />
              </Field>

              {/* From Email */}
              <Field>
                <FieldLabel htmlFor={`${type}-from-email`}>{CONTENT.fields.fromEmail} *</FieldLabel>
                <Input
                  id={`${type}-from-email`}
                  type="email"
                  value={emailConfig.from_email || ''}
                  onChange={(e) => updateConfig(type, { from_email: e.target.value })}
                  placeholder={CONTENT.fields.fromEmailPlaceholder}
                />
              </Field>

              {/* Reply To */}
              <Field>
                <FieldLabel htmlFor={`${type}-reply-to`}>{CONTENT.fields.replyTo}</FieldLabel>
                <Input
                  id={`${type}-reply-to`}
                  type="email"
                  value={emailConfig.reply_to || ''}
                  onChange={(e) => updateConfig(type, { reply_to: e.target.value })}
                  placeholder={CONTENT.fields.replyToPlaceholder}
                />
                <FieldDescription>{CONTENT.fields.replyToHint}</FieldDescription>
              </Field>

              {/* CC */}
              <Field>
                <FieldLabel htmlFor={`${type}-cc`}>{CONTENT.fields.cc}</FieldLabel>
                <Input
                  id={`${type}-cc`}
                  type="text"
                  value={emailConfig.cc || ''}
                  onChange={(e) => updateConfig(type, { cc: e.target.value })}
                  placeholder={CONTENT.fields.ccPlaceholder}
                />
                <FieldDescription>{CONTENT.fields.ccHint}</FieldDescription>
              </Field>

              {/* Subject */}
              <Field>
                <FieldLabel htmlFor={`${type}-subject`}>{CONTENT.fields.subject} *</FieldLabel>
                <Input
                  id={`${type}-subject`}
                  value={emailConfig.subject || ''}
                  onChange={(e) => updateConfig(type, { subject: e.target.value })}
                  placeholder={CONTENT.fields.subjectPlaceholder}
                />
              </Field>

              {/* Custom Message */}
              <Field>
                <FieldLabel htmlFor={`${type}-custom-message`}>
                  {CONTENT.fields.customMessage}
                </FieldLabel>
                <Textarea
                  id={`${type}-custom-message`}
                  value={emailConfig.custom_message || ''}
                  onChange={(e) => updateConfig(type, { custom_message: e.target.value })}
                  placeholder={CONTENT.fields.customMessagePlaceholder}
                  rows={3}
                />
                <FieldDescription>{CONTENT.fields.customMessageHint}</FieldDescription>
              </Field>

              {/* Instructions (only for order_created) */}
              {type === 'order_created' && (
                <Field>
                  <FieldLabel htmlFor={`${type}-instructions`}>
                    {CONTENT.fields.instructions}
                  </FieldLabel>
                  <Textarea
                    id={`${type}-instructions`}
                    value={emailConfig.instructions || ''}
                    onChange={(e) => updateConfig(type, { instructions: e.target.value })}
                    placeholder={CONTENT.fields.instructionsPlaceholder}
                    rows={2}
                  />
                  <FieldDescription>{CONTENT.fields.instructionsHint}</FieldDescription>
                </Field>
              )}

              {/* Include Next Steps */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={`${type}-include-next-steps`}
                  checked={emailConfig.include_next_steps || false}
                  onCheckedChange={(checked) =>
                    updateConfig(type, { include_next_steps: !!checked })
                  }
                />
                <div className="flex-1 min-w-0">
                  <FieldLabel htmlFor={`${type}-include-next-steps`} className="cursor-pointer">
                    {CONTENT.fields.includeNextSteps}
                  </FieldLabel>
                  <FieldDescription>{CONTENT.fields.includeNextStepsHint}</FieldDescription>
                </div>
              </div>

              {/* Next Steps List */}
              {emailConfig.include_next_steps && (
                <div className="space-y-3">
                  <FieldLabel>{CONTENT.fields.nextSteps}</FieldLabel>
                  {(emailConfig.next_steps || []).map((step: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={step}
                        onChange={(e) => updateNextStep(type, index, e.target.value)}
                        placeholder={CONTENT.fields.nextStepPlaceholder}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNextStep(type, index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addNextStep(type)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {CONTENT.fields.addStep}
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  return (
    <div className="space-y-5 min-w-0">
      {renderEmailSection(
        'order_created',
        CONTENT.sections.orderCreated.title,
        CONTENT.sections.orderCreated.description
      )}

      {renderEmailSection(
        'payment_confirmed',
        CONTENT.sections.paymentConfirmed.title,
        CONTENT.sections.paymentConfirmed.description
      )}
    </div>
  )
}
