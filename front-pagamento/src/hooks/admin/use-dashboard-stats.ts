'use client'

import { useQuery } from '@tanstack/react-query'

interface DashboardStats {
  products: {
    total: number
    active: number
  }
  payments: {
    total: number
    thisMonth: number
    revenue: number
  }
  orders: {
    total: number
    pending: number
    paid: number
  }
  subscriptions: {
    total: number
    active: number
  }
  webhooks: {
    total: number
    today: number
  }
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/admin/dashboard/stats')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar estatísticas do dashboard')
  }

  const { stats } = await response.json()
  return stats
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refetch a cada 5 minutos
  })
}
