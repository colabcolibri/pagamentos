'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { BrandSettingsCard } from '@/components/admin/brand-settings-card'
import { EmailSmtpSettingsCard } from '@/components/admin/email-smtp-settings-card'
import { GatewaySettingsCard } from '@/components/admin/gateway-settings-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'
import { type SetupStepStatus, useSetupStatus } from '@/hooks/admin/use-setup-status'

type ModalStepId = Exclude<SetupStepStatus['id'], 'catalog'>

export default function AdminSetupPage() {
  const { status, isLoading, error, refetch } = useSetupStatus()
  const { settings, save, isSaving } = usePlatformSettings()

  const [activeModal, setActiveModal] = useState<ModalStepId | null>(null)
  const [recipientsDraft, setRecipientsDraft] = useState('')

  useEffect(() => {
    if (settings) {
      setRecipientsDraft(settings.sale_notification_recipients ?? '')
    }
  }, [settings])

  function copyText(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado.`))
      .catch(() => toast.error('Não foi possível copiar.'))
  }

  async function handleSaveNotifications() {
    try {
      await save({ sale_notification_recipients: recipientsDraft.trim() || null })
      toast.success('Destinatários de aviso atualizados.')
      setActiveModal(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar destinatários.')
    }
  }

  const baseUrl = status?.appUrl?.replace(/\/$/, '') || ''
  const activeStep = status?.steps.find((s) => s.id === activeModal) ?? null

  return (
    <AdminPageLayout
      title="Setup inicial"
      subtitle="Passo a passo para colocar sua instalação no ar sem esquecer nada"
      action={
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar status
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Progresso da instalação</CardTitle>
              </div>
              {status && (
                <Badge variant={status.readyToOperate ? 'default' : 'secondary'}>
                  {status.readyToOperate
                    ? 'Pronto para operar'
                    : `${status.requiredCompletedCount}/${status.requiredTotalCount} obrigatórios`}
                </Badge>
              )}
            </div>
            <CardDescription>
              Siga os passos abaixo na ordem. Cada etapa abre apenas o necessário para você concluir
              e avançar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading && <Skeleton className="h-64 w-full rounded-md" />}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao verificar setup</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : String(error)}
                </AlertDescription>
              </Alert>
            )}

            {status && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {status.completedCount} de {status.totalCount} etapas concluídas
                    </span>
                    <span className="font-semibold tabular-nums">{status.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${status.percent}%` }}
                    />
                  </div>
                </div>

                <ol className="space-y-3">
                  {status.steps.map((step, index) => (
                    <li
                      key={step.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                          {step.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{step.title}</span>
                            <Badge
                              variant={step.required ? 'outline' : 'secondary'}
                              className="text-[10px]"
                            >
                              {step.required ? 'Obrigatório' : 'Opcional'}
                            </Badge>
                            {step.completed && (
                              <Badge variant="secondary" className="text-[10px]">
                                Concluído
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.missing.length > 0 && (
                            <ul className="space-y-0.5 pt-1 text-xs text-amber-700 dark:text-amber-400">
                              {step.missing.map((item) => (
                                <li key={item}>• Falta: {item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 pl-10 sm:pl-0">
                        {step.id === 'catalog' ? (
                          <Button
                            asChild
                            size="sm"
                            variant={step.completed ? 'outline' : 'default'}
                          >
                            <Link href="/admin/products">
                              {step.completed ? 'Ver produtos' : 'Criar produto'}
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={step.completed ? 'outline' : 'default'}
                            onClick={() => setActiveModal(step.id as ModalStepId)}
                          >
                            {step.completed ? 'Revisar' : 'Configurar'}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Todas essas opções e as configurações avançadas (IA, MCP, diagnóstico) também ficam
            organizadas em Configurações.
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Abrir Configurações
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeStep?.title ?? 'Configurar etapa'}</DialogTitle>
            <DialogDescription>{activeStep?.description}</DialogDescription>
          </DialogHeader>

          {activeModal === 'environment' && (
            <div className="space-y-4 text-sm">
              {activeStep && activeStep.missing.length === 0 ? (
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
                      {activeStep?.missing.map((item) => (
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
                <Button type="button" size="sm" onClick={() => setActiveModal(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}

          {activeModal === 'brand' && <BrandSettingsCard onSaved={() => setActiveModal(null)} />}

          {activeModal === 'email' && (
            <EmailSmtpSettingsCard onSaved={() => setActiveModal(null)} />
          )}

          {activeModal === 'gateways' && (
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

          {activeModal === 'operations' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Informe um ou mais e-mails separados por vírgula para receber um resumo automático
                  a cada venda confirmada.
                </p>
                <Textarea
                  value={recipientsDraft}
                  onChange={(e) => setRecipientsDraft(e.target.value)}
                  placeholder="ex.: operacao@suaempresa.com, financeiro@suaempresa.com"
                  rows={3}
                  disabled={isSaving}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveModal(null)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveNotifications()}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar destinatários
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  )
}
