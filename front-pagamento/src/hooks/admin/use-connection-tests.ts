'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ConnectionResult {
  id: string
  name: string
  status: 'ok' | 'error' | 'skipped'
  message: string
  configured?: boolean
}

async function fetchConnections(): Promise<ConnectionResult[]> {
  const res = await fetch('/api/admin/connections')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao buscar conexões')
  }
  const { connections } = await res.json()
  return connections
}

export function useConnectionTests() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'connections'],
    queryFn: fetchConnections,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: fetchConnections,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'connections'], data)
    },
  })

  return {
    connections: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    testConnections: mutation.mutate,
    isTesting: mutation.isPending,
    testError: mutation.error,
  }
}
