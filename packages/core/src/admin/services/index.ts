import type { SupabaseClient } from '../../types/query-client'

import { SupabaseAdminUserRepository } from '../repositories'
import type { Database } from '../types'
import { AdminService } from './admin.service'

// Admin Service
export { AdminService } from './admin.service'

/**
 * Factory para criar instância do AdminService
 */
export function createAdminService(
  supabase: SupabaseClient<Database>,
  supabaseWithAuth?: SupabaseClient<Database>
): AdminService {
  const repository = new SupabaseAdminUserRepository(supabase)
  return new AdminService(repository, supabaseWithAuth ?? supabase)
}

