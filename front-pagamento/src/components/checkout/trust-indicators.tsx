'use client'

import { CheckCircle2, ExternalLink, Lock, Shield } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CONTENT = {
  title: 'Compra segura',
  lead: 'Cobrança processada por instituição de pagamento regulada pelo Banco Central. Dados de cartão você informa só na página segura do provedor — não armazenamos nem digitamos cartão aqui.',
  bullets: {
    https: 'Conexão criptografada (HTTPS)',
    hosted: 'Checkout de pagamento em página segura do provedor',
    noCard: 'Cartão não passa por este site',
    refund: 'Política de reembolso antes de concluir',
  },
  privacyLink: 'Política de privacidade',
} as const

export interface TrustIndicatorsProps {
  /** URL pública da política, vinda da marca da instância. */
  privacyPolicyHref?: string | null
  className?: string
}

export function TrustIndicators({ privacyPolicyHref, className }: TrustIndicatorsProps) {
  return (
    <Card
      className={cn(
        'gap-0 border-success/25 bg-success/6 py-0 shadow-sm hover:border-success/35',
        className
      )}
    >
      <CardContent className="space-y-3 px-4 py-3.5 sm:space-y-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success ring-1 ring-success/20">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-[1.0625rem]">
              {CONTENT.title}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{CONTENT.lead}</p>
        </div>

        <ul className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 sm:gap-y-3" role="list">
          <li className="flex min-w-0 items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="text-xs font-medium leading-snug text-foreground">
              {CONTENT.bullets.https}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="text-xs font-medium leading-snug text-foreground">
              {CONTENT.bullets.hosted}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="text-xs font-medium leading-snug text-foreground">
              {CONTENT.bullets.noCard}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="text-xs font-medium leading-snug text-foreground">
              {CONTENT.bullets.refund}
            </span>
          </li>
        </ul>

        {privacyPolicyHref ? (
          <p className="border-t border-border/50 pt-2.5 text-xs text-muted-foreground sm:pt-3">
            <a
              href={privacyPolicyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              {CONTENT.privacyLink}
            </a>
            <span className="text-muted-foreground"> — como tratamos seus dados (LGPD).</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
