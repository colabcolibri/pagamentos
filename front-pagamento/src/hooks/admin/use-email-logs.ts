'use client'

import { useQuery } from '@tanstack/react-query'

export interface EmailLogListItem {
  id: string
  created_at: string | null
  updated_at: string | null
  status: string
  recipient: string
  subject: string
  from_name: string | null
  from_email: string | null
  reply_to: string | null
  cc: string[] | null
  error_message: string | null
  message_id: string | null
  metadata: Record<string, unknown> | null
  order_id: string | null
  webhook_event_id: string | null
}

export interface EmailLogDetail extends EmailLogListItem {
  body_html: string | null
  body_text: string | null
}

export interface EmailLogsParams {
  page?: number
  pageSize?: number
  status?: string | null
  q?: string | null
  type?: string | null
}

export interface EmailLogsResult {
  emailLogs: EmailLogListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function fetchEmailLogs(params: EmailLogsParams = {}): Promise<EmailLogsResult> {
  const { page = 1, pageSize = 48, status, q, type } = params
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(page))
  searchParams.set('pageSize', String(pageSize))
  if (status) searchParams.set('status', status)
  if (q?.trim()) searchParams.set('q', q.trim())
  if (type?.trim()) searchParams.set('type', type.trim())

  const response = await fetch(`/api/admin/email-logs?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar emails enviados')
  }

  const data = await response.json()
  return {
    emailLogs: data.emailLogs || [],
    total: data.total ?? 0,
    page: data.page ?? page,
    pageSize: data.pageSize ?? pageSize,
    totalPages: data.totalPages ?? 1,
  }
}

async function fetchEmailLogById(id: string): Promise<EmailLogDetail> {
  const response = await fetch(`/api/admin/email-logs/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao carregar email')
  }

  const data = await response.json()
  return data.emailLog as EmailLogDetail
}

export function useEmailLogs(params: EmailLogsParams = {}) {
  return useQuery({
    queryKey: ['admin', 'email-logs', params],
    queryFn: () => fetchEmailLogs(params),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useEmailLogDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'email-log', id],
    queryFn: () => fetchEmailLogById(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  })
}
