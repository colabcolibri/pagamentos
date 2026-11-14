'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Database,
  Package,
  Rocket,
  ShoppingCart,
  Webhook,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import {
  PaymentBreakdownCard,
  RevenueTrendChart,
  TopProductsAndRecentOrders,
} from '@/components/admin/dashboard-charts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type DashboardGateway,
  type DashboardPeriod,
  useDashboardStats,
} from '@/hooks/admin/use-dashboard-stats'
import { useSetupStatus } from '@/hooks/admin/use-setup-status'
import { cn } from '@/lib/utils'

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Este mês' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Tudo' },
]

const GATEWAY_OPTIONS: { value: DashboardGateway; label: string }[] = [
  { value: 'all', label: 'Todos gateways' },
  { value: 'asaas', label: 'Asaas' },
  { value: 'pagarme', label: 'Pagar.me' },
]

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [gateway, setGateway] = useState<DashboardGateway>('all')

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats({
    period,
    gateway,
  })
  const { status: setupStatus } = useSetupStatus()
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        setDbHealthy(Boolean(ok && body?.db === 'ok'))
      })
      .catch(() => {
        setDbHealthy(false)
      })
  }, [])

  return (
    <AdminPageLayout
      title="Visão geral"
      subtitle="Acompanhe vendas, pedidos e saúde operacional da plataforma"
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/admin/orders" />}>
            Ver pedidos
          </Button>
          <Button size="sm" render={<Link href="/admin/products" />}>
            Novo produto
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  period === opt.value
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
            {GATEWAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGateway(opt.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  gateway === opt.value
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {statsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>
              Não foi possível carregar as estatísticas do dashboard.
            </AlertDescription>
          </Alert>
        )}

        {statsLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2 py-5 sm:px-5 first:sm:pl-0 last:sm:pr-0">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-64 lg:col-span-2" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : stats ? (
          <>
            {/* KPI Strip minimalista condicionado aos filtros */}
            <section className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0">
              <Link
                href="/admin/payments"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5 first:sm:pl-0"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Receita confirmada</span>
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatBRL(stats.payments.revenue)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stats.payments.paidCount} pagos · ticket{' '}
                  {formatBRL(stats.payments.averageTicketCents)}
                </p>
              </Link>

              <Link
                href="/admin/orders"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pedidos no filtro</span>
                  <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.orders.total}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stats.orders.pending} pendentes · {stats.orders.paid} pagos (
                  {stats.orders.conversionRate}% conv.)
                </p>
              </Link>

              <Link
                href="/admin/products"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Produtos</span>
                  <Package className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.products.total}
                </p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {stats.products.active} ativos
                  {stats.topProducts[0] ? ` · líder: ${stats.topProducts[0].name}` : ''}
                </p>
              </Link>

              <Link
                href="/admin/subscriptions"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5 last:sm:pr-0"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assinaturas</span>
                  <Activity className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.subscriptions.total}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {stats.subscriptions.active} ativas
                </p>
              </Link>
            </section>

            {/* Gráficos filtráveis */}
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RevenueTrendChart series={stats.series} />
              </div>
              <PaymentBreakdownCard byMethod={stats.byMethod} byGateway={stats.byGateway} />
            </section>

            {/* Top produtos e últimos pedidos */}
            <TopProductsAndRecentOrders
              topProducts={stats.topProducts}
              recentOrders={stats.recentOrders}
            />

            {/* Operação & Sistema */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operação & Sistema
              </h2>
              <div className="divide-y divide-border/60 border-y border-border/60">
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Webhook className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Webhooks processados</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {stats.webhooks.today} recebidos hoje · {stats.webhooks.total} no total
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    render={<Link href="/admin/webhooks" />}
                  >
                    Abrir
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Banco de dados (Postgres)</p>
                      <p className="text-xs text-muted-foreground">
                        {dbHealthy === null
                          ? 'Verificando conexão...'
                          : dbHealthy
                            ? 'Conexão ativa e respondendo normalmente'
                            : 'Falha ao responder o healthcheck do banco'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      dbHealthy === null ? 'secondary' : dbHealthy ? 'default' : 'destructive'
                    }
                  >
                    {dbHealthy === null ? 'Verificando' : dbHealthy ? 'Conectado' : 'Erro'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Setup inicial da instância</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {setupStatus
                          ? setupStatus.readyToOperate
                            ? `${setupStatus.completedCount}/${setupStatus.totalCount} etapas concluídas (${setupStatus.percent}%)`
                            : `${setupStatus.requiredCompletedCount}/${setupStatus.requiredTotalCount} obrigatórios prontos`
                          : 'Verificando status do setup...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {setupStatus && (
                      <Badge variant={setupStatus.readyToOperate ? 'default' : 'secondary'}>
                        {setupStatus.readyToOperate ? 'Pronto' : 'Pendente'}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      render={<Link href="/admin/setup" />}
                    >
                      Abrir
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminPageLayout>
  )
}
