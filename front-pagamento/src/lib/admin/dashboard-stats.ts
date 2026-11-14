import { getPool } from '@/lib/db/pool'

interface PaymentAggregateRow {
  total: string
  this_month: string
  revenue: string
}

export async function loadDashboardStats() {
  const pool = getPool()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const monthIso = startOfMonth.toISOString()
  const dayIso = startOfDay.toISOString()

  const [productsRes, pagarmeRes, asaasRes, ordersRes, subscriptionsRes, webhooksRes] =
    await Promise.all([
      pool.query<{ total: string; active: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE active = true)::text AS active
         FROM payments.products`
      ),
      pool.query<PaymentAggregateRow>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE created_at >= $1)::text AS this_month,
                COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid' AND paid_at >= $1), 0)::text AS revenue
         FROM payments.pagarme_payments`,
        [monthIso]
      ),
      pool.query<PaymentAggregateRow>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE created_at >= $1)::text AS this_month,
                COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid' AND paid_at >= $1), 0)::text AS revenue
         FROM payments.asaas_payments`,
        [monthIso]
      ),
      pool.query<{ total: string; pending: string; paid: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
                COUNT(*) FILTER (WHERE status = 'paid')::text AS paid
         FROM payments.orders`
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
    ])

  const products = productsRes.rows[0]
  const pagarme = pagarmeRes.rows[0]
  const asaas = asaasRes.rows[0]
  const orders = ordersRes.rows[0]
  const subscriptions = subscriptionsRes.rows[0]
  const webhooks = webhooksRes.rows[0]

  return {
    products: {
      total: Number(products?.total ?? 0),
      active: Number(products?.active ?? 0),
    },
    payments: {
      total: Number(pagarme?.total ?? 0) + Number(asaas?.total ?? 0),
      thisMonth: Number(pagarme?.this_month ?? 0) + Number(asaas?.this_month ?? 0),
      revenue: Number(pagarme?.revenue ?? 0) + Number(asaas?.revenue ?? 0),
    },
    orders: {
      total: Number(orders?.total ?? 0),
      pending: Number(orders?.pending ?? 0),
      paid: Number(orders?.paid ?? 0),
    },
    subscriptions: {
      total: Number(subscriptions?.total ?? 0),
      active: Number(subscriptions?.active ?? 0),
    },
    webhooks: {
      total: Number(webhooks?.total ?? 0),
      today: Number(webhooks?.today ?? 0),
    },
  }
}
