'use client'

import { useState } from 'react'

import { CheckCircle2, ChevronDown, ExternalLink, Lock, Shield } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface TrustIndicatorsProps {
  /** URL pública da política, vinda da marca da instância. */
  privacyPolicyHref?: string | null
  /** Quando true, adapta o passo 1 para indicar que o e-mail já foi confirmado. */
  isEmailVerified?: boolean
  variant?: 'card' | 'compact'
  className?: string
}

export function TrustIndicators({
  privacyPolicyHref,
  isEmailVerified = false,
  variant = 'card',
  className,
}: TrustIndicatorsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground',
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Lock className="h-3.5 w-3.5 text-success" aria-hidden />
            Compra segura
          </span>
          <span aria-hidden>·</span>
          <span>Seus dados de cartão nunca passam por este site</span>
        </div>
        {privacyPolicyHref ? (
          <a
            href={privacyPolicyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Política de privacidade
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    )
  }

  const steps = [
    {
      num: '1',
      done: isEmailVerified,
      title: isEmailVerified ? 'E-mail verificado' : 'Confirme seu e-mail',
      desc: isEmailVerified
        ? 'Sua identidade já está confirmada para esta compra.'
        : 'Enviaremos um código de 6 dígitos para validar sua autenticidade.',
    },
    {
      num: '2',
      done: false,
      title: 'Preencha e confirme',
      desc: 'Informe seus dados e pague via PIX na hora ou no link seguro do provedor.',
    },
    {
      num: '3',
      done: false,
      title: 'Receba a confirmação',
      desc: 'Após o pagamento, atualizamos o status e enviamos tudo no seu e-mail.',
    },
  ]

  return (
    <Card
      className={cn(
        'gap-0 border-success/25 bg-success/5 py-0 shadow-xs hover:border-success/35',
        className
      )}
    >
      <CardContent className="space-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold text-foreground">
              Compra segura e transparente
            </span>
            <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:inline-flex">
              · <Lock className="h-3.5 w-3.5 text-success" aria-hidden /> Dados de cartão nunca
              passam por aqui
            </span>
          </div>

          <div className="flex items-center gap-3">
            {privacyPolicyHref ? (
              <a
                href={privacyPolicyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary"
              >
                Privacidade (LGPD)
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary sm:hidden"
              aria-expanded={mobileOpen}
            >
              Como funciona
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', mobileOpen && 'rotate-180')}
              />
            </button>
          </div>
        </div>

        <ol
          className={cn(
            'grid-cols-1 gap-3 border-t border-border/50 pt-3 sm:grid sm:grid-cols-3',
            mobileOpen ? 'grid' : 'hidden'
          )}
        >
          {steps.map((step) => (
            <li key={step.num} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  step.done ? 'bg-success text-success-foreground' : 'bg-success/15 text-success'
                )}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.num}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="text-sm leading-snug text-muted-foreground">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
