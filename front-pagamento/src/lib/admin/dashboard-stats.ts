import { createAdminPaymentsClient } from '@/lib/db/payments-query'

export async function loadDashboardStats() {
  const supabase = createAdminPaymentsClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count: productsTotal } = await supabase
    .schema('payments')
    .from('products')
    .select('*', { count: 'exact', head: true })
  const { count: productsActive } = await supabase
    .schema('payments')
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  const { count: pagarmePaymentsCount } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
  const { count: asaasPaymentsCount } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
  const { data: pagarmeRevenue } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('amount_cents')
    .eq('status', 'paid')
    .gte('paid_at', startOfMonth.toISOString())
  const { data: asaasRevenue } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .select('amount_cents')
    .eq('status', 'paid')
    .gte('paid_at', startOfMonth.toISOString())
  const { count: pagarmeTotal } = await supabase
    .schema('payments')
    .from('pagarme_payments')
    .select('*', { count: 'exact', head: true })
  const { count: asaasTotal } = await supabase
    .schema('payments')
    .from('asaas_payments')
    .select('*', { count: 'exact', head: true })
  const { count: ordersTotal } = await supabase
    .schema('payments')
    .from('orders')
    .select('*', { count: 'exact', head: true })
  const { count: ordersPending } = await supabase
    .schema('payments')
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: ordersPaid } = await supabase
    .schema('payments')
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid')
  const { count: subscriptionsTotal } = await supabase
    .schema('payments')
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
  const { count: subscriptionsActive } = await supabase
    .schema('payments')
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  const { count: webhooksTotal } = await supabase
    .schema('payments')
    .from('webhook_events')
    .select('*', { count: 'exact', head: true })
  const { count: webhooksToday } = await supabase
    .schema('payments')
    .from('webhook_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString())

  const sum = (rows: { amount_cents?: number }[] | null) =>
    rows?.reduce((total, row) => total + (row.amount_cents || 0), 0) || 0

  return {
    products: { total: productsTotal || 0, active: productsActive || 0 },
    payments: {
      total: (pagarmeTotal || 0) + (asaasTotal || 0),
      thisMonth: (pagarmePaymentsCount || 0) + (asaasPaymentsCount || 0),
      revenue: sum(pagarmeRevenue) + sum(asaasRevenue),
    },
    orders: {
      total: ordersTotal || 0,
      pending: ordersPending || 0,
      paid: ordersPaid || 0,
    },
    subscriptions: {
      total: subscriptionsTotal || 0,
      active: subscriptionsActive || 0,
    },
    webhooks: { total: webhooksTotal || 0, today: webhooksToday || 0 },
  }
}
