'use client'

import { useEffect, useState } from 'react'

import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw, Webhook, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { GatewaySettingsCard } from '@/components/admin/gateway-settings-card'
import { IntegrationKeysCard } from '@/components/admin/integration-keys-card'
import { McpSettingsCard } from '@/components/admin/mcp-settings-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useConnectionTests } from '@/hooks/admin/use-connection-tests'
import { usePlatformSettings } from '@/hooks/admin/use-platform-settings'

const CONTENT = {
  title: 'Configurações',
  subtitle: 'Preferências da plataforma e teste de integrações',

  saleNotify: {
    title: 'Aviso interno de venda',
    description:
      'Quando um pagamento for confirmado (webhook ou marcação manual), enviamos um e-mail para estes endereços com resumo do pedido. O cliente continua recebendo o e-mail configurado no produto. Use vírgula para vários e-mails.',
    placeholder: 'ex.: operacao@suaempresa.com, financeiro@suaempresa.com',
    save: 'Salvar',
    saving: 'Salvando…',
    saved: 'Destinatários atualizados.',
  },

  connections: {
    title: 'Teste de conexões',
    description:
      'Verifica se o Postgres, o Pagar.me, o Asaas e os webhooks respondem. Não expõe chaves ou dados sensíveis.',
    test: 'Testar conexões',
    testing: 'Testando...',
    lastTest: 'Último teste',
    never: 'Nunca',
  },

  status: {
    ok: 'Conectado',
    error: 'Erro',
    skipped: 'Não configurado',
  },

  error: {
    title: 'Erro ao carregar',
    description: 'Não foi possível carregar os testes de conexão.',
  },
} as const

function ConnectionCard({
  name,
  status,
  message,
}: {
  name: string
  status: 'ok' | 'error' | 'skipped'
  message: string
}) {
  const config = {
    ok: {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
      badge: 'default' as const,
    },
    error: {
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      badge: 'destructive' as const,
    },
    skipped: {
      icon: AlertCircle,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      badge: 'secondary' as const,
    },
  }[status]

  const Icon = config.icon

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-row items-center gap-4 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
        >
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{name}</span>
            <Badge variant={config.badge}>{CONTENT.status[status]}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground truncate" title={message}>
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminSettingsPage() {
  const { connections, isLoading, error, testConnections, isTesting, testError } =
    useConnectionTests()

  const { settings, isLoading: platformLoading, save, isSaving, saveError } = usePlatformSettings()

  const [recipientsDraft, setRecipientsDraft] = useState('')

  useEffect(() => {
    if (settings?.sale_notification_recipients != null) {
      setRecipientsDraft(settings.sale_notification_recipients)
    } else {
      setRecipientsDraft('')
    }
  }, [settings?.sale_notification_recipients])

  const handleSaveSaleNotify = async () => {
    try {
      const trimmed = recipientsDraft.trim()
      await save({
        sale_notification_recipients: trimmed === '' ? null : trimmed,
      })
      toast.success(CONTENT.saleNotify.saved)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Mail className="h-5 w-5 shrink-0" />
              {CONTENT.saleNotify.title}
            </CardTitle>
            <CardDescription className="max-w-2xl">
              {CONTENT.saleNotify.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {platformLoading ? (
              <Skeleton className="h-24 w-full rounded-md" />
            ) : (
              <>
                <Textarea
                  value={recipientsDraft}
                  onChange={(e) => setRecipientsDraft(e.target.value)}
                  placeholder={CONTENT.saleNotify.placeholder}
                  className="min-h-[100px] max-w-full resize-y break-all"
                  disabled={isSaving}
                  aria-label="E-mails para aviso de venda"
                />
                {saveError && (
                  <p className="text-sm text-destructive break-words">
                    {saveError instanceof Error ? saveError.message : String(saveError)}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={() => void handleSaveSaleNotify()}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {CONTENT.saleNotify.saving}
                    </>
                  ) : (
                    CONTENT.saleNotify.save
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <GatewaySettingsCard />
        <IntegrationKeysCard />
        <McpSettingsCard />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  {CONTENT.connections.title}
                </CardTitle>
                <CardDescription className="mt-1.5 max-w-2xl">
                  {CONTENT.connections.description}
                </CardDescription>
              </div>
              <Button
                onClick={() => testConnections()}
                disabled={isTesting || isLoading}
                className="shrink-0"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {CONTENT.connections.testing}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {CONTENT.connections.test}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">{CONTENT.error.title}</p>
                <p className="text-sm mt-1">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}

            {testError && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Erro ao testar</p>
                <p className="text-sm mt-1">
                  {testError instanceof Error ? testError.message : String(testError)}
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : connections.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connections.map((c) => (
                  <ConnectionCard key={c.id} name={c.name} status={c.status} message={c.message} />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}
