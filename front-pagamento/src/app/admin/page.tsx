'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Package,
  ShoppingCart,
  Webhook,
} from 'lucide-react'

import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/hooks/admin'

const CONTENT = {
  title: 'Dashboard',
  subtitle: 'Visão geral da operação e saúde do sistema',
  actions: {
    newProduct: 'Produtos',
    viewOrders: 'Ver pedidos',
    openLink: 'Abrir',
  },
  kpis: {
    revenue: 'Receita do mês',
    orders: 'Pedidos',
    products: 'Produtos',
    subscriptions: 'Assinaturas',
  },
  descriptions: {
    monthPayments: (count: number) => `${count} pagamentos este mês`,
    ordersSummary: (pending: number, paid: number) => `${pending} pendentes · ${paid} pagos`,
    activeProducts: (count: number) => `${count} produtos ativos`,
    activeSubscriptions: (count: number) => `${count} assinaturas ativas`,
    todayWebhooks: (today: number, total: number) => `${today} recebidos hoje · ${total} no total`,
    coreVersion: (version: string) => `Versão ${version}`,
    coreNotFound: 'Pacote não encontrado',
  },
  systemSection: {
    title: 'Operação & Sistema',
    webhooksLabel: 'Webhooks processados',
    coreLabel: 'Pacote @quitou/core',
    coreActive: 'Ativo',
    coreError: 'Erro',
  },
  error: {
    title: 'Erro ao carregar estatísticas',
    description: 'Tente recarregar a página.',
  },
} as const

type CoreStatus = {
  installed: boolean
  version?: string
  error?: string
}

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const [coreStatus, setCoreStatus] = useState<CoreStatus>({ installed: false })

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.core) {
          setCoreStatus(data.core)
        }
      })
      .catch((err) => {
        setCoreStatus({
          installed: false,
          error: err instanceof Error ? err.message : CONTENT.descriptions.coreNotFound,
        })
      })
  }, [])

  return (
    <AdminPageLayout
      title={CONTENT.title}
      subtitle={CONTENT.subtitle}
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/admin/orders" />}>
            {CONTENT.actions.viewOrders}
          </Button>
          <Button size="sm" render={<Link href="/admin/products" />}>
            {CONTENT.actions.newProduct}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    >
      <div className="space-y-10">
        {statsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{CONTENT.error.title}</AlertTitle>
            <AlertDescription>{CONTENT.error.description}</AlertDescription>
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
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : stats ? (
          <>
            {/* KPI Strip minimalista */}
            <section className="grid grid-cols-1 divide-y divide-border/60 border-y border-border/60 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0">
              <Link
                href="/admin/payments"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5 first:sm:pl-0"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{CONTENT.kpis.revenue}</span>
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatBRL(stats.payments.revenue)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {CONTENT.descriptions.monthPayments(stats.payments.thisMonth)}
                </p>
              </Link>

              <Link
                href="/admin/orders"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{CONTENT.kpis.orders}</span>
                  <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.orders.total}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {CONTENT.descriptions.ordersSummary(stats.orders.pending, stats.orders.paid)}
                </p>
              </Link>

              <Link
                href="/admin/products"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{CONTENT.kpis.products}</span>
                  <Package className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.products.total}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {CONTENT.descriptions.activeProducts(stats.products.active)}
                </p>
              </Link>

              <Link
                href="/admin/subscriptions"
                className="group space-y-1.5 py-5 transition-colors hover:bg-muted/20 sm:px-5 last:sm:pr-0"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{CONTENT.kpis.subscriptions}</span>
                  <Activity className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary" />
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {stats.subscriptions.total}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {CONTENT.descriptions.activeSubscriptions(stats.subscriptions.active)}
                </p>
              </Link>
            </section>

            {/* Operação & Sistema em lista limpa */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CONTENT.systemSection.title}
              </h2>
              <div className="divide-y divide-border/60 border-y border-border/60">
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Webhook className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{CONTENT.systemSection.webhooksLabel}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {CONTENT.descriptions.todayWebhooks(
                          stats.webhooks.today,
                          stats.webhooks.total
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    render={<Link href="/admin/webhooks" />}
                  >
                    {CONTENT.actions.openLink}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{CONTENT.systemSection.coreLabel}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {coreStatus.installed
                          ? CONTENT.descriptions.coreVersion(coreStatus.version || '')
                          : coreStatus.error || CONTENT.descriptions.coreNotFound}
                      </p>
                    </div>
                  </div>
                  <Badge variant={coreStatus.installed ? 'default' : 'destructive'}>
                    {coreStatus.installed
                      ? CONTENT.systemSection.coreActive
                      : CONTENT.systemSection.coreError}
                  </Badge>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminPageLayout>
  )
}
