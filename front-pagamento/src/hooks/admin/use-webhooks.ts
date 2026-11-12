'use client'

import { useQuery } from '@tanstack/react-query'

export interface WebhookEvent {
  id: string
  provider: 'pagarme' | 'asaas'
  event_type: string | null
  payload: Record<string, unknown> | null
  headers: Record<string, string> | null
  processing_status: string
  processing_log: string | null
  created_at: string
}

export interface WebhooksParams {
  page?: number
  pageSize?: number
  provider?: string | null
  status?: string | null
  eventType?: string | null
}

export interface WebhooksResult {
  webhooks: WebhookEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function fetchWebhooks(params: WebhooksParams = {}): Promise<WebhooksResult> {
  const { page = 1, pageSize = 48, provider, status, eventType } = params
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(page))
  searchParams.set('pageSize', String(pageSize))
  if (provider) searchParams.set('provider', provider)
  if (status) searchParams.set('status', status)
  if (eventType?.trim()) searchParams.set('eventType', eventType.trim())

  const response = await fetch(`/api/admin/webhooks?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar webhooks')
  }

  const data = await response.json()
  return {
    webhooks: data.webhooks || [],
    total: data.total ?? 0,
    page: data.page ?? page,
    pageSize: data.pageSize ?? pageSize,
    totalPages: data.totalPages ?? 1,
  }
}

export function useWebhooks(params: WebhooksParams = {}) {
  return useQuery({
    queryKey: ['admin', 'webhooks', params],
    queryFn: () => fetchWebhooks(params),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}
