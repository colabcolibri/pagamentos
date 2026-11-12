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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/hooks/admin'

const CONTENT = {
  title: 'Dashboard',
  subtitle: 'Visão geral do sistema',

  cards: {
    core: '@quitou/core',
    products: 'Produtos',
    revenue: 'Receita do Mês',
    orders: 'Pedidos',
    subscriptions: 'Assinaturas',
    webhooks: 'Webhooks',
  },

  error: {
    title: 'Erro ao carregar estatísticas',
    description: 'Tente recarregar a página',
  },
} as const

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor?: 'primary' | 'success' | 'tertiary' | 'warning' | 'destructive' | 'muted'
  href?: string
  variant?: 'default' | 'large'
}

// ============================================================================
// CONFIGURAÇÕES DE CORES
// ============================================================================
const ICON_COLOR_MAP = {
  primary: {
    text: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
  },
  tertiary: {
    text: 'text-tertiary',
    bg: 'bg-tertiary/10',
    border: 'border-tertiary',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
  },
  destructive: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive',
  },
  muted: {
    text: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-muted',
  },
} as const

type IconColorType = keyof typeof ICON_COLOR_MAP

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'primary',
  href,
  variant = 'default',
}: StatCardProps & { iconColor?: IconColorType }) => {
  const CardWrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}
  const colorConfig = ICON_COLOR_MAP[iconColor || 'primary']

  return (
    // @ts-expect-error - CardWrapper pode ser Link ou div dinamicamente
    <CardWrapper {...wrapperProps}>
      <Card
        className={`transition-all ${
          href
            ? `hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-l-4 border-l-transparent hover:${colorConfig.border}`
            : ''
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`p-2.5 rounded-lg ${colorConfig.text} ${colorConfig.bg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={
              variant === 'large'
                ? 'scroll-m-20 text-4xl font-extrabold tracking-tight mb-1'
                : 'scroll-m-20 text-3xl font-bold tracking-tight'
            }
          >
            {value}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{description}</p>
            {href && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  )
}

export default function AdminDashboard() {
  const [coreStatus, setCoreStatus] = useState<{
    installed: boolean
    version?: string
    error?: string
  }>({ installed: false })

  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()

  useEffect(() => {
    const checkCore = async () => {
      try {
        const corePackage = await import('@quitou/core/package.json')
        setCoreStatus({ installed: true, version: corePackage.version || '1.0.0' })
      } catch (error) {
        setCoreStatus({
          installed: false,
          error: error instanceof Error ? error.message : 'Não encontrado',
        })
      }
    }
    checkCore()
  }, [])

  return (
    <AdminPageLayout title={CONTENT.title} subtitle={CONTENT.subtitle}>
      <div className="space-y-4 md:space-y-6">
        {/* Error State */}
        {statsError && (
          <Card className="border-destructive/20 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{CONTENT.error.title}</p>
                  <p className="text-sm text-destructive/80 mt-1">{CONTENT.error.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-9 w-20 mb-3" />
                  <Skeleton className="h-3 w-36" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={CONTENT.cards.core}
              icon={Package}
              iconColor={coreStatus.installed ? 'success' : 'destructive'}
              value={coreStatus.installed ? '✓ Ativo' : '✗ Erro'}
              description={
                coreStatus.installed
                  ? `Versão ${coreStatus.version}`
                  : coreStatus.error || 'Não encontrado'
              }
            />

            <StatCard
              title={CONTENT.cards.products}
              icon={Package}
              iconColor="primary"
              value={stats.products.total}
              description={`${stats.products.active} produtos ativos`}
              href="/admin/products"
            />

            <StatCard
              title={CONTENT.cards.revenue}
              icon={CreditCard}
              iconColor="success"
              value={`R$ ${(stats.payments.revenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description={`${stats.payments.thisMonth} pagamentos este mês`}
              href="/admin/payments"
              variant="large"
            />

            <StatCard
              title={CONTENT.cards.orders}
              icon={ShoppingCart}
              iconColor="tertiary"
              value={stats.orders.total}
              description={`${stats.orders.pending} pendentes • ${stats.orders.paid} pagos`}
              href="/admin/orders"
            />

            <StatCard
              title={CONTENT.cards.subscriptions}
              icon={Activity}
              iconColor="warning"
              value={stats.subscriptions.total}
              description={`${stats.subscriptions.active} assinaturas ativas`}
              href="/admin/subscriptions"
            />

            <StatCard
              title={CONTENT.cards.webhooks}
              icon={Webhook}
              iconColor="primary"
              value={stats.webhooks.total}
              description={`${stats.webhooks.today} recebidos hoje`}
              href="/admin/webhooks"
            />
          </div>
        ) : null}
      </div>
    </AdminPageLayout>
  )
}
