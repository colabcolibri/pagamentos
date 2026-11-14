'use client'

import Link from 'next/link'

import { ArrowRight, BarChart3 } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type {
  DashboardGatewayBreakdown,
  DashboardMethodBreakdown,
  DashboardRecentOrder,
  DashboardSeriesPoint,
  DashboardTopProduct,
} from '@/hooks/admin/use-dashboard-stats'

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatCompactBRL(reais: number): string {
  if (reais >= 1000) {
    return `R$ ${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

const revenueChartConfig = {
  revenueReais: {
    label: 'Receita',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
  spot: 'PIX ou cartão',
  outros: 'Outros',
}

const GATEWAY_LABELS: Record<string, string> = {
  asaas: 'Asaas',
  pagarme: 'Pagar.me',
  outros: 'Outros',
}

const ORDER_STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  paid: { label: 'Pago', variant: 'default' },
  pending: { label: 'Pendente', variant: 'secondary' },
  pix_generated: { label: 'PIX gerado', variant: 'secondary' },
  boleto_generated: { label: 'Boleto gerado', variant: 'secondary' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
  expired: { label: 'Expirado', variant: 'outline' },
  refunded: { label: 'Reembolsado', variant: 'outline' },
}

export function RevenueTrendChart({ series }: { series: DashboardSeriesPoint[] }) {
  const maxRevenue = Math.max(...series.map((p) => p.revenueCents), 0)
  const totalRevenue = series.reduce((sum, p) => sum + p.revenueCents, 0)
  const totalPaid = series.reduce((sum, p) => sum + p.paidOrders, 0)
  const chartData = series.map((point) => ({
    ...point,
    revenueReais: Number((point.revenueCents / 100).toFixed(2)),
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução da receita
            </CardTitle>
            <CardDescription>
              {`${formatBRL(totalRevenue)} confirmados em ${totalPaid} pedidos pagos no filtro`}
            </CardDescription>
          </div>
          {series.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Pico: {formatBRL(maxRevenue)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Nenhum pedido registrado para o período e gateway selecionados.
          </div>
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-56 w-full">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenueReais)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-revenueReais)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={64}
                tickFormatter={(value: number) => formatCompactBRL(value)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value, _name, item) => {
                      const payload = item.payload as DashboardSeriesPoint & {
                        revenueReais: number
                      }
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium tabular-nums">
                            {formatBRL(payload.revenueCents)}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {payload.paidOrders} pagos de {payload.totalOrders} pedidos
                          </span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Area
                dataKey="revenueReais"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenueReais)"
                strokeWidth={2}
                dot={{ r: 3, fillOpacity: 1 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function BreakdownBars({
  title,
  items,
}: {
  title: string
  items: { key: string; label: string; count: number; revenueCents: number }[]
}) {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenueCents, 0)
  const totalCount = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados no filtro.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const share =
              totalRevenue > 0
                ? Math.round((item.revenueCents / totalRevenue) * 100)
                : totalCount > 0
                  ? Math.round((item.count / totalCount) * 100)
                  : 0
            return (
              <div key={item.key} className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatBRL(item.revenueCents)} · {item.count} ped. ({share}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all"
                    style={{ width: `${Math.max(share, item.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PaymentBreakdownCard({
  byMethod,
  byGateway,
}: {
  byMethod: DashboardMethodBreakdown[]
  byGateway: DashboardGatewayBreakdown[]
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição de vendas</CardTitle>
        <CardDescription>Meios de pagamento e gateways no período selecionado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <BreakdownBars
          title="Por meio de pagamento"
          items={byMethod.map((item) => ({
            key: item.method,
            label: METHOD_LABELS[item.method] ?? item.method,
            count: item.count,
            revenueCents: item.revenueCents,
          }))}
        />
        <BreakdownBars
          title="Por gateway"
          items={byGateway.map((item) => ({
            key: item.gateway,
            label: GATEWAY_LABELS[item.gateway] ?? item.gateway,
            count: item.count,
            revenueCents: item.revenueCents,
          }))}
        />
      </CardContent>
    </Card>
  )
}

export function TopProductsAndRecentOrders({
  topProducts,
  recentOrders,
}: {
  topProducts: DashboardTopProduct[]
  recentOrders: DashboardRecentOrder[]
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
          <CardDescription>Ranking por receita confirmada no filtro atual</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda confirmada no filtro.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {product.count} {product.count === 1 ? 'venda paga' : 'vendas pagas'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatBRL(product.revenueCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Últimos pedidos</CardTitle>
            <CardDescription>Movimentação mais recente dentro do filtro</CardDescription>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado no filtro.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {recentOrders.map((order) => {
                const statusMeta = ORDER_STATUS_META[order.status] ?? {
                  label: order.status,
                  variant: 'outline' as const,
                }
                return (
                  <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.productName}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {GATEWAY_LABELS[order.paymentGateway] ?? order.paymentGateway} ·{' '}
                        {METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod} ·{' '}
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {formatBRL(order.amountCents)}
                      </span>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
