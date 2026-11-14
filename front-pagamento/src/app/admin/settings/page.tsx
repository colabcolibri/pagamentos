'use client'

import { Suspense, useEffect, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import {
  AlertCircle,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Webhook,
  XCircle,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { BrandSettingsCard } from '@/components/admin/brand-settings-card'
import { DevSeedCard } from '@/components/admin/dev-seed-card'
import { EmailSmtpSettingsCard } from '@/components/admin/email-smtp-settings-card'
import { GatewaySettingsCard } from '@/components/admin/gateway-settings-card'
import { IntegrationKeysCard } from '@/components/admin/integration-keys-card'
import { McpSettingsCard } from '@/components/admin/mcp-settings-card'
import { SaleNotificationsCard } from '@/components/admin/sale-notifications-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectionTests } from '@/hooks/admin/use-connection-tests'
import { cn } from '@/lib/utils'

const CONTENT = {
  title: 'Configurações',
  subtitle: 'Preferências da plataforma, marca, e-mails, gateways e integrações',

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
    testTitle: 'Erro ao testar',
    description: 'Não foi possível carregar os testes de conexão.',
  },
} as const

type SettingsTabId =
  | 'brand'
  | 'email'
  | 'gateways'
  | 'notifications'
  | 'integrations'
  | 'mcp'
  | 'connections'

const SETTINGS_TABS: {
  id: SettingsTabId
  label: string
  description: string
  icon: typeof Building2
}[] = [
  {
    id: 'brand',
    label: 'Identidade & Empresa',
    description: 'Nome, logo, CNPJ e links',
    icon: Building2,
  },
  {
    id: 'email',
    label: 'E-mail & SMTP',
    description: 'Servidor, remetente e rodapé',
    icon: Mail,
  },
  {
    id: 'gateways',
    label: 'Gateways',
    description: 'Asaas, Pagar.me e webhooks',
    icon: CreditCard,
  },
  {
    id: 'notifications',
    label: 'Avisos de venda',
    description: 'Destinatários internos',
    icon: Bell,
  },
  {
    id: 'integrations',
    label: 'Integrações & IA',
    description: 'Chaves de API externas',
    icon: KeyRound,
  },
  {
    id: 'mcp',
    label: 'MCP (Agentes IA)',
    description: 'Permissões e tokens OAuth',
    icon: Bot,
  },
  {
    id: 'connections',
    label: 'Conexões & Saúde',
    description: 'Diagnóstico de serviços',
    icon: Webhook,
  },
]

function isValidTab(value: string | null): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value)
}

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
          <p className="mt-0.5 truncate text-sm text-muted-foreground" title={message}>
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    isValidTab(tabParam) ? tabParam : 'brand'
  )

  useEffect(() => {
    if (isValidTab(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  function selectTab(tab: SettingsTabId) {
    setActiveTab(tab)
    router.replace(`/admin/settings?tab=${tab}`, { scroll: false })
  }

  const { connections, isLoading, error, testConnections, isTesting, testError } =
    useConnectionTests()

  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
        <nav
          aria-label="Seções de configurações"
          className="flex gap-1.5 overflow-x-auto pb-1 md:sticky md:top-6 md:flex-col md:overflow-visible md:pb-0"
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{tab.label}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {tab.description}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {activeTab === 'brand' && <BrandSettingsCard />}

          {activeTab === 'email' && <EmailSmtpSettingsCard />}

          {activeTab === 'gateways' && <GatewaySettingsCard />}

          {activeTab === 'notifications' && <SaleNotificationsCard />}

          {activeTab === 'integrations' && <IntegrationKeysCard />}

          {activeTab === 'mcp' && <McpSettingsCard />}

          {activeTab === 'connections' && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Webhook className="h-5 w-5 text-muted-foreground" />
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
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{CONTENT.error.title}</AlertTitle>
                    <AlertDescription>
                      {error instanceof Error ? error.message : String(error)}
                    </AlertDescription>
                  </Alert>
                )}

                {testError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{CONTENT.error.testTitle}</AlertTitle>
                    <AlertDescription>
                      {testError instanceof Error ? testError.message : String(testError)}
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {connections.map((conn) => (
                      <ConnectionCard
                        key={conn.id}
                        name={conn.name}
                        status={conn.status}
                        message={conn.message}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'connections' && <DevSeedCard />}
        </div>
      </div>
    </AdminPageLayout>
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
          <Skeleton className="h-96 w-full rounded-lg" />
        </AdminPageLayout>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  )
}
