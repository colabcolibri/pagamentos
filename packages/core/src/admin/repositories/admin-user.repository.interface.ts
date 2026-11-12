import type { AdminQueryOptions, AdminUser, CreateAdminUserDTO, UpdateAdminUserDTO } from '../types'

/**
 * Interface do repositório de usuários administrativos
 */
export interface AdminUserRepository {
  /**
   * Busca um admin por ID
   */
  findById(id: string): Promise<AdminUser | null>

  /**
   * Busca um admin por email
   */
  findByEmail(email: string): Promise<AdminUser | null>

  /**
   * Busca admins com filtros
   */
  findMany(options?: AdminQueryOptions): Promise<AdminUser[]>

  /**
   * Conta admins com filtros
   */
  count(options?: AdminQueryOptions): Promise<number>

  /**
   * Cria um novo admin
   */
  create(data: CreateAdminUserDTO): Promise<AdminUser>

  /**
   * Atualiza um admin existente
   */
  update(id: string, data: UpdateAdminUserDTO): Promise<AdminUser>

  /**
   * Desativa um admin (soft delete)
   */
  deactivate(id: string): Promise<void>

  /**
   * Verifica se um admin existe
   */
  exists(id: string): Promise<boolean>

  /**
   * Verifica se um email já está cadastrado
   */
  existsByEmail(email: string): Promise<boolean>
}

