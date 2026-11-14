'use client'

import { useQuery } from '@tanstack/react-query'

export type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | '90d' | 'all'
export type DashboardGateway = 'all' | 'asaas' | 'pagarme'

export interface DashboardFilter {
  period: DashboardPeriod
  gateway: DashboardGateway
}

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

async function fetchDashboardStats(filter: DashboardFilter): Promise<DashboardStats> {
  const params = new URLSearchParams({
    period: filter.period,
    gateway: filter.gateway,
  })
  const response = await fetch(`/api/admin/dashboard/stats?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Erro ao buscar estatísticas do dashboard')
  }

  const { stats } = await response.json()
  return stats
}

export function useDashboardStats(filter: DashboardFilter = { period: '30d', gateway: 'all' }) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats', filter.period, filter.gateway],
    queryFn: () => fetchDashboardStats(filter),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
