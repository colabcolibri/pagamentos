import type { SupabaseClient } from '../../types/query-client'

import type {
  AdminQueryOptions,
  AdminUser,
  CreateAdminUserDTO, Database, DbAdminUser,
  DbAdminUserInsert,
  DbAdminUserUpdate,
  UpdateAdminUserDTO
} from '../types'
import type { AdminUserRepository } from './admin-user.repository.interface'

/**
 * Implementação Supabase do repositório de usuários administrativos
 */
export class SupabaseAdminUserRepository implements AdminUserRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<AdminUser | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return this.mapToAdminUser(data as unknown as DbAdminUser)
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return this.mapToAdminUser(data as unknown as DbAdminUser)
  }

  async findMany(options?: AdminQueryOptions): Promise<AdminUser[]> {
    let query = this.supabase.schema('payments').from('admin_users').select('*')

    // Filtrar apenas ativos por padrão
    if (options?.isActive !== false) {
      query = query.eq('is_active', true)
    } else if (options.isActive === false) {
      query = query.eq('is_active', false)
    }

    // Aplicar filtros
    query = this.applyFilters(query, options)

    // Aplicar ordenação
    const orderBy = options?.orderBy || 'created_at'
    const orderDirection = options?.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Aplicar paginação
    if (options?.limit) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map((item: any) => this.mapToAdminUser(item as unknown as DbAdminUser))
  }

  async count(options?: AdminQueryOptions): Promise<number> {
    let query = this.supabase
      .schema('payments')
      .from('admin_users')
      .select('*', { count: 'exact', head: true })

    // Filtrar apenas ativos por padrão
    if (options?.isActive !== false) {
      query = query.eq('is_active', true)
    } else if (options.isActive === false) {
      query = query.eq('is_active', false)
    }

    // Aplicar filtros
    query = this.applyFilters(query, options)

    const { count, error } = await query

    if (error) {
      throw error
    }

    return count || 0
  }

  async create(data: CreateAdminUserDTO): Promise<AdminUser> {
    // Gerar UUID para o ID
    const { v4: uuidv4 } = await import('uuid')
    const id = uuidv4()

    const insertData: DbAdminUserInsert = {
      id,
      email: data.email,
      name: data.name,
      role: data.role || 'admin',
      is_active: data.is_active ?? true,
    }

    const { data: admin, error } = await this.supabase
      .schema('payments')
      .from('admin_users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!admin) {
      throw new Error('Admin não foi criado')
    }

    return this.mapToAdminUser(admin as unknown as DbAdminUser)
  }

  async update(id: string, data: UpdateAdminUserDTO): Promise<AdminUser> {
    const updateData: DbAdminUserUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: admin, error } = await this.supabase
      .schema('payments')
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!admin) {
      throw new Error('Admin não foi atualizado')
    }

    return this.mapToAdminUser(admin as unknown as DbAdminUser)
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase
      .schema('payments')
      .from('admin_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  async exists(id: string): Promise<boolean> {
    const admin = await this.findById(id)
    return admin !== null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const admin = await this.findByEmail(email)
    return admin !== null
  }

  /**
   * Aplica filtros na query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, options?: AdminQueryOptions): any {
    if (options?.email) {
      query = query.eq('email', options.email)
    }

    if (options?.role) {
      query = query.eq('role', options.role)
    }

    return query
  }

  /**
   * Mapeia dados do banco para AdminUser
   */
  private mapToAdminUser(data: DbAdminUser): AdminUser {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: (data.role || 'admin') as AdminUser['role'],
      is_active: data.is_active ?? true,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }
}

