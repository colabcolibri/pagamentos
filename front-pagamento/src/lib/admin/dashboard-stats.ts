import { getPool } from '@/lib/db/pool'

import type { DashboardFilter, DashboardGateway, DashboardPeriod } from './dashboard-filter'

export type { DashboardFilter, DashboardGateway, DashboardPeriod }

export interface DashboardSeriesPoint {
  bucket: string
  label: string
  revenueCents: number
  paidOrders: number
  totalOrders: number
}

export interface DashboardMethodBreakdown {
  method: string
  count: number
  revenueCents: number
}

export interface DashboardGatewayBreakdown {
  gateway: string
  count: number
  revenueCents: number
}

export interface DashboardTopProduct {
  id: string
  name: string
  count: number
  revenueCents: number
}

export interface DashboardRecentOrder {
  id: string
  status: string
  amountCents: number
  paymentMethod: string
  paymentGateway: string
  productName: string
  createdAt: string
}

export interface DashboardStats {
  filter: DashboardFilter
  products: {
    total: number
    active: number
  }
  payments: {
    total: number
    paidCount: number
    revenue: number
    averageTicketCents: number
  }
  orders: {
    total: number
    pending: number
    paid: number
    conversionRate: number
  }
  subscriptions: {
    total: number
    active: number
  }
  webhooks: {
    total: number
    today: number
  }
  series: DashboardSeriesPoint[]
  byMethod: DashboardMethodBreakdown[]
  byGateway: DashboardGatewayBreakdown[]
  topProducts: DashboardTopProduct[]
  recentOrders: DashboardRecentOrder[]
}

function resolveStartDate(period: DashboardPeriod): Date | null {
  const now = new Date()
  if (period === 'all') return null
  if (period === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === 'month') {
    const start = new Date(now)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return start
  }
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return start
}

function buildOrderWhere(filter: DashboardFilter): { sql: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  const startDate = resolveStartDate(filter.period)

  if (startDate) {
    params.push(startDate.toISOString())
    clauses.push(`o.created_at >= $${params.length}`)
  }

  if (filter.gateway !== 'all') {
    params.push(filter.gateway)
    clauses.push(`o.payment_gateway = $${params.length}`)
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

function buildTruncUnit(period: DashboardPeriod): 'hour' | 'day' | 'month' {
  if (period === 'today') return 'hour'
  if (period === 'all') return 'month'
  return 'day'
}

function formatBucketLabel(bucketIso: string, unit: 'hour' | 'day' | 'month'): string {
  const date = new Date(bucketIso)
  if (Number.isNaN(date.getTime())) return bucketIso
  if (unit === 'hour') {
    return `${String(date.getHours()).padStart(2, '0')}h`
  }
  if (unit === 'month') {
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export async function loadDashboardStats(
  filter: DashboardFilter = { period: '30d', gateway: 'all' }
): Promise<DashboardStats> {
  const pool = getPool()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const dayIso = startOfDay.toISOString()

  const where = buildOrderWhere(filter)
  const truncUnit = buildTruncUnit(filter.period)

  const [
    productsRes,
    ordersRes,
    subscriptionsRes,
    webhooksRes,
    seriesRes,
    methodRes,
    gatewayRes,
    topProductsRes,
    recentOrdersRes,
  ] = await Promise.all([
    pool.query<{ total: string; active: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE active = true)::text AS active
       FROM payments.products`
    ),
    pool.query<{
      total: string
      pending: string
      paid: string
      revenue: string
    }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE o.status IN ('pending', 'pix_generated', 'boleto_generated'))::text AS pending,
              COUNT(*) FILTER (WHERE o.status = 'paid')::text AS paid,
              COALESCE(SUM(o.amount_cents) FILTER (WHERE o.status = 'paid'), 0)::text AS revenue
       FROM payments.orders o
       ${where.sql}`,
      where.params
    ),
    pool.query<{ total: string; active: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE status = 'active')::text AS active
       FROM payments.subscriptions`
    ),
    pool.query<{ total: string; today: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE created_at >= $1)::text AS today
       FROM payments.webhook_events`,
      [dayIso]
    ),
    pool.query<{
      bucket: string
      revenue_cents: string
      paid_orders: string
      total_orders: string
    }>(
      `SELECT date_trunc('${truncUnit}', o.created_at)::text AS bucket,
              COALESCE(SUM(o.amount_cents) FILTER (WHERE o.status = 'paid'), 0)::text AS revenue_cents,
              COUNT(*) FILTER (WHERE o.status = 'paid')::text AS paid_orders,
              COUNT(*)::text AS total_orders
       FROM payments.orders o
       ${where.sql}
       GROUP BY 1
       ORDER BY 1 ASC`,
      where.params
    ),
    pool.query<{ method: string; count: string; revenue_cents: string }>(
      `SELECT COALESCE(NULLIF(o.payment_method, ''), 'outros') AS method,
              COUNT(*)::text AS count,
              COALESCE(SUM(o.amount_cents) FILTER (WHERE o.status = 'paid'), 0)::text AS revenue_cents
       FROM payments.orders o
       ${where.sql}
       GROUP BY 1
       ORDER BY SUM(o.amount_cents) FILTER (WHERE o.status = 'paid') DESC NULLS LAST, COUNT(*) DESC`,
      where.params
    ),
    pool.query<{ gateway: string; count: string; revenue_cents: string }>(
      `SELECT COALESCE(NULLIF(o.payment_gateway, ''), 'outros') AS gateway,
              COUNT(*)::text AS count,
              COALESCE(SUM(o.amount_cents) FILTER (WHERE o.status = 'paid'), 0)::text AS revenue_cents
       FROM payments.orders o
       ${where.sql}
       GROUP BY 1
       ORDER BY SUM(o.amount_cents) FILTER (WHERE o.status = 'paid') DESC NULLS LAST, COUNT(*) DESC`,
      where.params
    ),
    pool.query<{ id: string; name: string; count: string; revenue_cents: string }>(
      `SELECT p.id,
              p.name,
              COUNT(*) FILTER (WHERE o.status = 'paid')::text AS count,
              COALESCE(SUM(o.amount_cents) FILTER (WHERE o.status = 'paid'), 0)::text AS revenue_cents
       FROM payments.orders o
       JOIN payments.prices pr ON pr.id = o.price_id
       JOIN payments.products p ON p.id = pr.product_id
       ${where.sql}
       GROUP BY p.id, p.name
       HAVING COUNT(*) FILTER (WHERE o.status = 'paid') > 0
       ORDER BY SUM(o.amount_cents) FILTER (WHERE o.status = 'paid') DESC
       LIMIT 5`,
      where.params
    ),
    pool.query<{
      id: string
      status: string
      amount_cents: number
      payment_method: string | null
      payment_gateway: string | null
      product_name: string | null
      created_at: string
    }>(
      `SELECT o.id,
              o.status,
              o.amount_cents,
              o.payment_method,
              o.payment_gateway,
              p.name AS product_name,
              o.created_at::text AS created_at
       FROM payments.orders o
       LEFT JOIN payments.prices pr ON pr.id = o.price_id
       LEFT JOIN payments.products p ON p.id = pr.product_id
       ${where.sql}
       ORDER BY o.created_at DESC
       LIMIT 5`,
      where.params
    ),
  ])

  const products = productsRes.rows[0]
  const orders = ordersRes.rows[0]
  const subscriptions = subscriptionsRes.rows[0]
  const webhooks = webhooksRes.rows[0]

  const ordersTotal = Number(orders?.total ?? 0)
  const ordersPending = Number(orders?.pending ?? 0)
  const ordersPaid = Number(orders?.paid ?? 0)
  const revenue = Number(orders?.revenue ?? 0)
  const averageTicketCents = ordersPaid > 0 ? Math.round(revenue / ordersPaid) : 0
  const conversionRate = ordersTotal > 0 ? Math.round((ordersPaid / ordersTotal) * 100) : 0

  return {
    filter,
    products: {
      total: Number(products?.total ?? 0),
      active: Number(products?.active ?? 0),
    },
    payments: {
      total: ordersTotal,
      paidCount: ordersPaid,
      revenue,
      averageTicketCents,
    },
    orders: {
      total: ordersTotal,
      pending: ordersPending,
      paid: ordersPaid,
      conversionRate,
    },
    subscriptions: {
      total: Number(subscriptions?.total ?? 0),
      active: Number(subscriptions?.active ?? 0),
    },
    webhooks: {
      total: Number(webhooks?.total ?? 0),
      today: Number(webhooks?.today ?? 0),
    },
    series: seriesRes.rows.map((row) => ({
      bucket: row.bucket,
      label: formatBucketLabel(row.bucket, truncUnit),
      revenueCents: Number(row.revenue_cents ?? 0),
      paidOrders: Number(row.paid_orders ?? 0),
      totalOrders: Number(row.total_orders ?? 0),
    })),
    byMethod: methodRes.rows.map((row) => ({
      method: row.method,
      count: Number(row.count ?? 0),
      revenueCents: Number(row.revenue_cents ?? 0),
    })),
    byGateway: gatewayRes.rows.map((row) => ({
      gateway: row.gateway,
      count: Number(row.count ?? 0),
      revenueCents: Number(row.revenue_cents ?? 0),
    })),
    topProducts: topProductsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      count: Number(row.count ?? 0),
      revenueCents: Number(row.revenue_cents ?? 0),
    })),
    recentOrders: recentOrdersRes.rows.map((row) => ({
      id: row.id,
      status: row.status,
      amountCents: Number(row.amount_cents ?? 0),
      paymentMethod: row.payment_method ?? 'outros',
      paymentGateway: row.payment_gateway ?? 'outros',
      productName: row.product_name ?? 'Produto',
      createdAt: row.created_at,
    })),
  }
}
