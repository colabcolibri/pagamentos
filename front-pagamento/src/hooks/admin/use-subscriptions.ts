'use client'

import { useQuery } from '@tanstack/react-query'

export type SubscriptionStatus = 'incomplete' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface Subscription {
  id: string
  user_id: string
  price_id: string
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  trial_end: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  profiles?: {
    id: string
    email: string
    name: string | null
  }
  prices?: {
    id: string
    amount: number
    currency: string
    recurring: boolean
    interval: string | null
    interval_count: number | null
    products?: {
      id: string
      name: string
      ref: string
    }
  }
}

export interface FetchSubscriptionsParams {
  userId?: string
  status?: SubscriptionStatus | SubscriptionStatus[]
  includeRelations?: boolean
  limit?: number
  offset?: number
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[]
  total: number
  limit?: number
  offset?: number
}

export function useSubscriptions(params: FetchSubscriptionsParams = {}) {
  const { userId, status, includeRelations = true, limit = 20, offset = 0 } = params

  return useQuery<SubscriptionsResponse>({
    queryKey: ['admin', 'subscriptions', userId, status, includeRelations, limit, offset],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (userId) searchParams.set('userId', userId)
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status]
        searchParams.set('status', statusArray.join(','))
      }
      if (includeRelations) searchParams.set('includeRelations', 'true')
      if (limit) searchParams.set('limit', limit.toString())
      if (offset) searchParams.set('offset', offset.toString())

      const response = await fetch(`/api/admin/subscriptions?${searchParams.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar assinaturas')
      }

      return response.json()
    },
    staleTime: 30 * 1000, // 30 segundos
  })
}
