'use client'

import { useQuery } from '@tanstack/react-query'

import type { Order } from '@/lib/payments/order'

/**
 * Busca pedidos via API Route
 */
async function fetchOrders(): Promise<{ orders: Order[] }> {
  const response = await fetch('/api/admin/orders?includeRelations=true&limit=100')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar pedidos')
  }

  return response.json()
}

/**
 * Hook para buscar pedidos (versão simples, sem filtros)
 */
export function useOrders() {
  return useQuery({
    queryKey: ['admin', 'orders', 'simple'],
    queryFn: () => fetchOrders(),
    select: (data) => data.orders,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}
