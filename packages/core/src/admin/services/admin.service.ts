import type { SupabaseClient } from '../../types/query-client'

import { ConflictError, NotFoundError, ValidationError } from '../../errors'
import { getLogger } from '../../logger'

import type { AdminUserRepository } from '../repositories'
import type { AdminUser, CreateAdminUserDTO, Database, UpdateAdminUserDTO } from '../types'

/**
 * Service para gerenciar usuários administrativos
 * Contém lógica de negócio relacionada a admins
 */
export class AdminService {
  private logger = getLogger()

  constructor(
    private adminUserRepository: AdminUserRepository,
    private supabase?: SupabaseClient<Database>
  ) {}

  /**
   * Busca um admin por ID
   * @throws {NotFoundError} Se admin não encontrado
   */
  async getAdminById(id: string): Promise<AdminUser> {
    if (!id) {
      throw new ValidationError('ID do admin é obrigatório', 'id')
    }

    this.logger.info('Buscando admin por ID', { id })

    const admin = await this.adminUserRepository.findById(id)

    if (!admin) {
      throw new NotFoundError('Admin', id)
    }

    return admin
  }

  /**
   * Busca um admin por email
   * @throws {NotFoundError} Se admin não encontrado
   */
  async getAdminByEmail(email: string): Promise<AdminUser> {
    if (!email) {
      throw new ValidationError('Email do admin é obrigatório', 'email')
    }

    if (!email.includes('@')) {
      throw new ValidationError('Email inválido', 'email')
    }

    this.logger.info('Buscando admin por email', { email })

    const admin = await this.adminUserRepository.findByEmail(email)

    if (!admin) {
      throw new NotFoundError('Admin', email)
    }

    return admin
  }

  /**
   * Lista todos os admins
   */
  async getAllAdmins(options?: { isActive?: boolean }): Promise<AdminUser[]> {
    this.logger.info('Buscando todos os admins', { options })

    try {
      const admins = await this.adminUserRepository.findMany({
        isActive: options?.isActive,
      })

      this.logger.info('Admins buscados com sucesso', {
        count: admins.length,
      })

      return admins
    } catch (error) {
      this.logger.error('Erro ao buscar admins', error, { options })
      throw error
    }
  }

  /**
   * Cria um novo admin
   * @throws {ValidationError} Se dados inválidos
   * @throws {ConflictError} Se email já existe
   */
  async createAdmin(data: CreateAdminUserDTO): Promise<AdminUser> {
    this.logger.info('Criando admin', { email: data.email, name: data.name })

    // Validações de negócio
    if (!data.email || !data.email.includes('@')) {
      throw new ValidationError('Email inválido', 'email')
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Nome do admin é obrigatório', 'name')
    }

    if (data.name.length > 255) {
      throw new ValidationError('Nome do admin deve ter no máximo 255 caracteres', 'name')
    }

    // Verificar conflitos
    const existing = await this.adminUserRepository.existsByEmail(data.email)
    if (existing) {
      throw new ConflictError('Admin com este email já existe')
    }

    try {
      const admin = await this.adminUserRepository.create(data)

      this.logger.info('Admin criado com sucesso', {
        adminId: admin.id,
        email: admin.email,
      })

      return admin
    } catch (error) {
      this.logger.error('Erro ao criar admin', error, { email: data.email })
      throw error
    }
  }

  /**
   * Atualiza um admin existente
   * @throws {NotFoundError} Se admin não encontrado
   * @throws {ValidationError} Se dados inválidos
   */
  async updateAdmin(id: string, data: UpdateAdminUserDTO): Promise<AdminUser> {
    this.logger.info('Atualizando admin', { id, data })

    // Verificar se existe
    const existing = await this.adminUserRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Admin', id)
    }

    // Validações de negócio
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError('Nome do admin não pode ser vazio', 'name')
      }

      if (data.name.length > 255) {
        throw new ValidationError('Nome do admin deve ter no máximo 255 caracteres', 'name')
      }
    }

    try {
      const admin = await this.adminUserRepository.update(id, data)

      this.logger.info('Admin atualizado com sucesso', {
        adminId: admin.id,
      })

      return admin
    } catch (error) {
      this.logger.error('Erro ao atualizar admin', error, { id, data })
      throw error
    }
  }

  /**
   * Desativa um admin
   * @throws {NotFoundError} Se admin não encontrado
   */
  async deactivateAdmin(id: string): Promise<void> {
    this.logger.info('Desativando admin', { id })

    // Verificar se existe
    const existing = await this.adminUserRepository.findById(id)
    if (!existing) {
      throw new NotFoundError('Admin', id)
    }

    try {
      await this.adminUserRepository.deactivate(id)

      this.logger.info('Admin desativado com sucesso', { id })
    } catch (error) {
      this.logger.error('Erro ao desativar admin', error, { id })
      throw error
    }
  }

  /**
   * Valida acesso de admin por email
   * Retorna null se não encontrado ou inativo
   */
  async validateAdminAccess(email: string): Promise<AdminUser | null> {
    this.logger.info('Validando acesso admin', { email })

    try {
      const admin = await this.adminUserRepository.findByEmail(email)

      if (!admin || !admin.is_active) {
        this.logger.warn('Acesso admin negado', { email, reason: 'não encontrado ou inativo' })
        return null
      }

      this.logger.info('Acesso admin validado', { email, adminId: admin.id })
      return admin
    } catch (error) {
      this.logger.error('Erro ao validar acesso admin', error, { email })
      return null
    }
  }

  /**
   * Verifica se o usuário atual é admin
   * Requer SupabaseClient com contexto de autenticação
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    if (!this.supabase) {
      this.logger.warn('SupabaseClient não fornecido para isCurrentUserAdmin')
      return false
    }

    try {
      const { data, error } = await this.supabase.schema('payments').rpc('is_admin_user')

      if (error) {
        this.logger.error('Erro ao verificar se é admin', error)
        return false
      }

      const isAdmin = data || false

      return isAdmin
    } catch (error) {
      this.logger.error('Erro ao verificar se é admin', error)
      return false
    }
  }

  /**
   * Verifica se o usuário atual é super admin
   * Requer SupabaseClient com contexto de autenticação
   */
  async isCurrentUserSuperAdmin(): Promise<boolean> {
    if (!this.supabase) {
      this.logger.warn('SupabaseClient não fornecido para isCurrentUserSuperAdmin')
      return false
    }

    try {
      const { data, error } = await this.supabase.schema('payments').rpc('is_super_admin')

      if (error) {
        this.logger.error('Erro ao verificar se é super admin', error)
        return false
      }

      const isSuperAdmin = data || false
      return isSuperAdmin
    } catch (error) {
      this.logger.error('Erro ao verificar se é super admin', error)
      return false
    }
  }

  /**
   * Busca o admin atual (baseado no contexto de autenticação)
   * Requer SupabaseClient com contexto de autenticação
   */
  async getCurrentAdmin(): Promise<AdminUser | null> {
    if (!this.supabase) {
      this.logger.warn('SupabaseClient não fornecido para getCurrentAdmin')
      return null
    }

    try {
      const { data, error } = await this.supabase.schema('payments').rpc('get_current_admin')

      if (error) {
        this.logger.error('Erro ao buscar admin atual', error)
        return null
      }

      const admin = data?.[0] || null

      if (admin) {
        return this.mapToAdminUser(admin)
      }
      return null
    } catch (error) {
      this.logger.error('Erro ao buscar admin atual', error)
      return null
    }
  }

  /**
   * Verifica se um admin tem uma permissão específica
   * Requer SupabaseClient com contexto de autenticação
   * Nota: A função RPC 'admin_has_permission' pode não estar disponível no Database type
   */
  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    if (!this.supabase) {
      this.logger.warn('SupabaseClient não fornecido para hasPermission')
      return false
    }

    if (!adminId || !permission) {
      throw new ValidationError('adminId e permission são obrigatórios')
    }

    this.logger.info('Verificando permissão', { adminId, permission })

    try {
      // Usar any para RPC functions que podem não estar no Database type
      const { data, error } = await (this.supabase.schema('payments').rpc as any)(
        'admin_has_permission',
        {
          admin_id: adminId,
          permission_key: permission,
        }
      )

      if (error) {
        this.logger.error('Erro ao verificar permissão', error, { adminId, permission })
        return false
      }

      const hasPermission = Boolean(data)
      this.logger.info('Verificação de permissão concluída', { adminId, permission, hasPermission })

      return hasPermission
    } catch (error) {
      this.logger.error('Erro ao verificar permissão', error, { adminId, permission })
      return false
    }
  }

  /**
   * Promove um usuário a admin (via RPC function)
   * Requer SupabaseClient com contexto de autenticação
   * Nota: A função RPC 'promote_user_to_admin' pode não estar disponível no Database type
   */
  async promoteUserToAdmin(
    email: string,
    name: string,
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<string> {
    if (!this.supabase) {
      throw new ValidationError('SupabaseClient é obrigatório para promoteUserToAdmin')
    }

    if (!email || !email.includes('@')) {
      throw new ValidationError('Email inválido', 'email')
    }

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Nome é obrigatório', 'name')
    }

    this.logger.info('Promovendo usuário a admin', { email, name, role })

    try {
      // Usar any para RPC functions que podem não estar no Database type
      const { data, error } = await (this.supabase.schema('payments').rpc as any)(
        'promote_user_to_admin',
        {
          user_email: email,
          admin_name: name,
          admin_role: role,
        }
      )

      if (error) {
        this.logger.error('Erro ao promover usuário a admin', error, { email, name, role })
        throw error
      }

      const adminId = String(data || '')
      this.logger.info('Usuário promovido a admin com sucesso', { email, adminId })
      return adminId
    } catch (error) {
      this.logger.error('Erro ao promover usuário a admin', error, { email, name, role })
      throw error
    }
  }

  /**
   * Mapeia dados do banco para AdminUser
   */
  private mapToAdminUser(data: any): AdminUser {
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

