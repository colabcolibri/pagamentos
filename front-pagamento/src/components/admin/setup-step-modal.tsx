'use client'

import Link from 'next/link'

import { AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { BrandSettingsCard } from '@/components/admin/brand-settings-card'
import { EmailSmtpSettingsCard } from '@/components/admin/email-smtp-settings-card'
import { GatewaySettingsCard } from '@/components/admin/gateway-settings-card'
import { SaleNotificationsCard } from '@/components/admin/sale-notifications-card'
import { Dialog } from '@/components/layout/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { SetupStepStatus } from '@/hooks/admin/use-setup-status'

export type SetupModalStepId = Exclude<SetupStepStatus['id'], 'catalog'>

interface SetupStepModalProps {
  open: boolean
  stepId: SetupModalStepId | null
  step: SetupStepStatus | null
  appUrl: string
  onClose: () => void
}

function copyText(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copiado.`))
    .catch(() => toast.error('Não foi possível copiar.'))
}

export function SetupStepModal({ open, stepId, step, appUrl, onClose }: SetupStepModalProps) {
  const baseUrl = appUrl.replace(/\/$/, '')

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      title={step?.title ?? 'Configurar etapa'}
      description={step?.description}
      size="3xl"
      showIcon={false}
      scrollable
      hideFooter
    >
      {stepId === 'environment' && (
        <div className="space-y-4 text-sm">
          {step && step.missing.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Ambiente validado</AlertTitle>
              <AlertDescription>
                Postgres conectado e variáveis obrigatórias (`ACCESS_CODE_SECRET`,
                `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`) definidas no servidor.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pendências no ambiente (.env)</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {step?.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/settings?tab=connections">
                Ver diagnóstico de conexões
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {stepId === 'brand' && <BrandSettingsCard onSaved={onClose} />}

      {stepId === 'email' && <EmailSmtpSettingsCard onSaved={onClose} />}

      {stepId === 'gateways' && (
        <div className="space-y-4">
          {baseUrl && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium">
                URLs de Webhook para cadastrar no Asaas / Pagar.me:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Webhook Asaas', url: `${baseUrl}/api/payments/asaas/webhook` },
                  { label: 'Webhook Pagar.me', url: `${baseUrl}/api/payments/pagarme/webhook` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className="truncate font-mono text-muted-foreground">{item.url}</div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => copyText(item.url, item.label)}
                      aria-label={`Copiar ${item.label}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <GatewaySettingsCard />
        </div>
      )}

      {stepId === 'operations' && <SaleNotificationsCard onSaved={onClose} />}
    </Dialog>
  )
}
