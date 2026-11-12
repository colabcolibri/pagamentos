import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { devError } from '@/lib/dev-log'

type SessionPayload = {
  user: { id: string; email: string; name?: string } | null
  isAdmin: boolean
  role: string | null
}

async function loadSession(): Promise<SessionPayload> {
  const response = await fetch('/api/auth/session', { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Não foi possível ler a sessão')
  }
  return response.json()
}

export function useCurrentAdmin() {
  return useQuery({
    queryKey: ['admin', 'current'],
    queryFn: async () => {
      try {
        const session = await loadSession()
        if (!session.user || !session.isAdmin) return null
        return {
          name: session.user.name || session.user.email,
          email: session.user.email,
          role: session.role ?? '',
        }
      } catch (error) {
        devError('Erro ao buscar admin atual:', error)
        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ['admin', 'isAdmin'],
    queryFn: async () => (await loadSession()).isAdmin,
    staleTime: 10 * 60 * 1000,
  })
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ['admin', 'isSuperAdmin'],
    queryFn: async () => (await loadSession()).role === 'super_admin',
    staleTime: 10 * 60 * 1000,
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
