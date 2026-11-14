import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthSession } from './use-auth-session'

export function useCurrentAdmin() {
  return useAuthSession({
    staleTime: 5 * 60 * 1000,
    select: (session) => {
      if (!session.user || !session.isAdmin) return null
      return {
        name: session.user.name || session.user.email || '',
        email: session.user.email ?? '',
        role: session.role ?? '',
      }
    },
  })
}

export function useIsAdmin() {
  return useAuthSession({
    staleTime: 10 * 60 * 1000,
    select: (session) => session.isAdmin,
  })
}

export function useIsSuperAdmin() {
  return useAuthSession({
    staleTime: 10 * 60 * 1000,
    select: (session) => session.role === 'super_admin',
  })
}

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/admins', { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Não foi possível carregar os administradores')
      }
      const body = (await response.json()) as { admins: AdminUserRow[] }
      return body.admins
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      throw new Error('A criação de admin é feita no banco, pelo e-mail do perfil')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      throw new Error('A atualização de admin é feita no banco')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'current'] })
    },
  })
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      throw new Error('A desativação de admin é feita no banco')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
