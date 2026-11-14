'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

export type SetupStepStatus = {
  id: 'environment' | 'brand' | 'email' | 'gateways' | 'catalog' | 'operations'
  title: string
  description: string
  required: boolean
  completed: boolean
  missing: string[]
}

export type SetupStatusReport = {
  percent: number
  requiredPercent: number
  completedCount: number
  totalCount: number
  requiredCompletedCount: number
  requiredTotalCount: number
  readyToOperate: boolean
  appUrl: string
  steps: SetupStepStatus[]
}

async function fetchSetupStatus(): Promise<SetupStatusReport> {
  const res = await fetch('/api/admin/setup-status')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao carregar status do setup')
  }
  return res.json()
}

async function postTestEmail(to?: string): Promise<{ ok: boolean; recipient: string }> {
  const res = await fetch('/api/admin/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(to ? { to } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao enviar e-mail de teste')
  }
  return data
}

export function useSetupStatus() {
  const query = useQuery({
    queryKey: ['admin', 'setup-status'],
    queryFn: fetchSetupStatus,
    staleTime: 30_000,
  })

  const testEmailMutation = useMutation({
    mutationFn: postTestEmail,
  })

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    sendTestEmail: testEmailMutation.mutateAsync,
    isSendingTestEmail: testEmailMutation.isPending,
  }
}
