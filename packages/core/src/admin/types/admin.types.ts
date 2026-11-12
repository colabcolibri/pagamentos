import type { Database } from './supabase-types'

/**
 * Role do admin
 */
export type AdminRole = 'admin' | 'super_admin'

/**
 * Usuário administrativo
 */
export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

/**
 * Sessão administrativa
 */
export interface AdminSession {
  id: string
  admin_user_id: string
  session_token: string
  expires_at: string
  created_at: string
}

/**
 * DTO para criar admin
 */
export interface CreateAdminUserDTO {
  email: string
  name: string
  role?: AdminRole
  is_active?: boolean
}

/**
 * DTO para atualizar admin
 */
export interface UpdateAdminUserDTO {
  name?: string
  role?: AdminRole
  is_active?: boolean
}

/**
 * Opções de query para buscar admins
 */
export interface AdminQueryOptions {
  email?: string
  role?: AdminRole
  isActive?: boolean
  orderBy?: 'created_at' | 'updated_at' | 'name' | 'email'
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Tipos do banco de dados
 */
export type DbAdminUser = Database['payments']['Tables']['admin_users']['Row']
export type DbAdminUserInsert = Database['payments']['Tables']['admin_users']['Insert']
export type DbAdminUserUpdate = Database['payments']['Tables']['admin_users']['Update']

