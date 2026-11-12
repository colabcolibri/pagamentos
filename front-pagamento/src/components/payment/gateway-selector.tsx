'use client'

import type { AsaasCheckoutFlow } from '@/components/checkout/checkout-form-content'
import { RequiredFieldMark } from '@/components/checkout/required-field-mark'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CONTENT = {
  title: 'Forma de pagamento',
  subtitle: 'Escolha à vista ou parcelado no cartão',
  avista: { label: 'À vista' },
  parcelado: { label: 'Parcelado no cartão' },
} as const

interface GatewaySelectorProps {
  checkoutFlow: AsaasCheckoutFlow
  onFlowChange: (flow: AsaasCheckoutFlow) => void
  disabled?: boolean
}

export function GatewaySelector({
  checkoutFlow,
  onFlowChange,
  disabled = false,
}: GatewaySelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="scroll-m-20 text-xl font-semibold tracking-tight text-foreground inline-flex flex-wrap items-baseline gap-0">
          <span>{CONTENT.title}</span>
          <RequiredFieldMark className="ml-0.5 shrink-0" />
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-1">
          {CONTENT.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onFlowChange('avista')}
            disabled={disabled}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              checkoutFlow === 'avista'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <p className="font-medium text-foreground">{CONTENT.avista.label}</p>
          </button>
          <button
            type="button"
            onClick={() => onFlowChange('parcelado')}
            disabled={disabled}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              checkoutFlow === 'parcelado'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <p className="font-medium text-foreground">{CONTENT.parcelado.label}</p>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
