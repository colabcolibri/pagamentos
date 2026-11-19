'use client'

import { useState } from 'react'

import { CheckCircle2, ChevronDown, ExternalLink, Lock, ShieldCheck } from 'lucide-react'

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
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground',
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Lock className="h-4 w-4 text-success" aria-hidden />
            Compra segura
          </span>
          <span aria-hidden>·</span>
          <span>Dados do cartão nunca passam por este site</span>
        </div>
        {privacyPolicyHref ? (
          <a
            href={privacyPolicyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Política de privacidade
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
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
        : 'Você recebe um código de 6 dígitos para validar sua autenticidade.',
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
      title: 'Acompanhe pelo e-mail',
      desc: 'Assim que o pagamento aprovar, atualizamos o status e enviamos seu comprovante.',
    },
  ]

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/70 bg-gradient-to-br from-success/6 via-background to-background py-0 shadow-xs',
        className
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success ring-1 ring-success/20">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Compra segura e transparente
              </h3>
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                <span>Dados sensíveis de cartão nunca passam por este site.</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {privacyPolicyHref ? (
              <a
                href={privacyPolicyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary sm:inline-flex"
              >
                Privacidade
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground sm:hidden"
              aria-expanded={mobileOpen}
            >
              Etapas
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', mobileOpen && 'rotate-180')}
              />
            </button>
          </div>
        </div>

        <ol
          className={cn(
            'space-y-3 border-t border-border/50 pt-3.5 sm:block',
            mobileOpen ? 'block' : 'hidden'
          )}
        >
          {steps.map((step) => (
            <li key={step.num} className="flex items-start gap-3 text-sm leading-relaxed">
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  step.done
                    ? 'bg-success text-success-foreground'
                    : 'border border-success/30 bg-success/10 text-success'
                )}
              >
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.num}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-foreground">{step.title} — </span>
                <span className="text-muted-foreground">{step.desc}</span>
              </div>
            </li>
          ))}
        </ol>

        {privacyPolicyHref ? (
          <div className="border-t border-border/50 pt-2.5 sm:hidden">
            <a
              href={privacyPolicyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              Política de privacidade (LGPD)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
