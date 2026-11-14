'use client'

import { type UseQueryOptions, useQuery } from '@tanstack/react-query'

export interface AuthSessionPayload {
  user: { id: string; email: string | null; name?: string } | null
  isAdmin: boolean
  role: string | null
}

const EMPTY_SESSION: AuthSessionPayload = {
  user: null,
  isAdmin: false,
  role: null,
}

export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const

export async function fetchAuthSession(): Promise<AuthSessionPayload> {
  const response = await fetch('/api/auth/session', { credentials: 'include' })
  if (!response.ok) {
    return EMPTY_SESSION
  }
  return (await response.json()) as AuthSessionPayload
}

export function useAuthSession<TData = AuthSessionPayload>(
  options?: Omit<UseQueryOptions<AuthSessionPayload, Error, TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: fetchAuthSession,
    staleTime: 2 * 60 * 1000,
    retry: false,
    ...options,
  })
}
