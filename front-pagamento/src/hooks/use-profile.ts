'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from './use-auth-session'

export interface Order {
  id: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'
  amount_cents: number
  payment_method: string | null
  payment_gateway: 'pagarme' | 'asaas'
  order_type: 'one_time' | 'subscription'
  created_at: string
  updated_at: string
  paid_at?: string | null
  expires_at?: string | null
  metadata?: Record<string, unknown> | null
  products?: {
    name: string
    ref: string
    description?: string | null
  } | null
  prices?: {
    currency: string
    interval?: string | null
    interval_count?: number | null
  } | null
}

export interface ProfileData {
  profile: {
    id: string
    name: string | null
    phone: string | null
    email: string | null
  } | null
  user: {
    id: string
    email: string | null
  }
}

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch('/api/profile')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Erro ao buscar perfil')
  }
  return res.json()
}

async function fetchProfileOrders(): Promise<Order[]> {
  const res = await fetch('/api/profile/orders')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Erro ao buscar pedidos')
  }
  const data = await res.json()
  return data.orders ?? []
}

async function patchProfile(body: { name: string; phone: string }): Promise<ProfileData> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Erro ao atualizar perfil')
  }
  return res.json()
}

export function useAuthCheck() {
  return useAuthSession({
    staleTime: 1 * 60 * 1000,
  })
}

export function useProfile(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Erro ao buscar perfil')) return false
      return failureCount < 1
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useProfileOrders(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  return useQuery({
    queryKey: ['profile', 'orders'],
    queryFn: fetchProfileOrders,
    enabled,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Erro ao buscar pedidos')) return false
      return failureCount < 1
    },
    staleTime: 1 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: patchProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data)
    },
  })
}
