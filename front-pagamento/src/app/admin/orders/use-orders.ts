'use client'

import { useQuery } from '@tanstack/react-query'

import type { Order } from '@/lib/payments/order'

interface FetchOrdersParams {
  status?: string | null
  gateway?: string | null
  paymentMethod?: string | null
  orderType?: string | null
  page?: number
  pageSize?: number
}

interface FetchOrdersResult {
  orders: Order[]
  total: number
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

/**
 * Busca pedidos via API Route
 */
async function fetchOrders(params: FetchOrdersParams = {}): Promise<FetchOrdersResult> {
  const { status, gateway, paymentMethod, orderType, page = 1, pageSize = 20 } = params

  const searchParams = new URLSearchParams()
  if (status) searchParams.append('status', status)
  if (gateway) searchParams.append('paymentGateway', gateway)
  if (paymentMethod) searchParams.append('paymentMethod', paymentMethod)
  if (orderType) searchParams.append('orderType', orderType)
  searchParams.append('includeRelations', 'true')
  searchParams.append('limit', String(pageSize))
  searchParams.append('offset', String((page - 1) * pageSize))

  const response = await fetch(`/api/admin/orders?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar pedidos')
  }

  const data = await response.json()

  const totalPages = data.total && pageSize ? Math.ceil(data.total / pageSize) : 0

  return {
    orders: data.orders,
    total: data.total,
    limit: data.limit,
    offset: data.offset,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Hook para buscar pedidos
 */
export function useOrders(params: FetchOrdersParams = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () => fetchOrders(params),
    staleTime: 1 * 60 * 1000, // 1 minuto (orders mudam mais frequentemente)
  })
}

export type { FetchOrdersParams, FetchOrdersResult }
