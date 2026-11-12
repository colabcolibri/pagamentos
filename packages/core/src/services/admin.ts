// ==========================================
// SERVIÇO DE ADMINISTRAÇÃO
// ==========================================

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminSession {
  id: string;
  admin_user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

interface CreateAdminUserData {
  email: string;
  name: string;
  role?: 'admin' | 'super_admin';
}

interface UpdateAdminUserData {
  name?: string;
  role?: 'admin' | 'super_admin';
  is_active?: boolean;
}

export class AdminService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // ==========================================
  // GESTÃO DE USUÁRIOS ADMIN
  // ==========================================

  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar admin por email:', error);
      throw error;
    }
  }

  async getAdminById(id: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar admin por ID:', error);
      throw error;
    }
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erro ao listar admins:', error);
      throw error;
    }
  }

  async createAdmin(adminData: CreateAdminUserData): Promise<AdminUser> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .insert({
          email: adminData.email,
          name: adminData.name,
          role: adminData.role || 'admin'
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao criar admin:', error);
      throw error;
    }
  }

  async updateAdmin(id: string, updates: UpdateAdminUserData): Promise<AdminUser> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao atualizar admin:', error);
      throw error;
    }
  }

  async deactivateAdmin(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .schema('payments')
        .from('admin_users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao desativar admin:', error);
      throw error;
    }
  }

  // ==========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ==========================================

  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .rpc('admin_has_permission', {
          admin_id: adminId,
          permission_key: permission
        });

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  async validateAdminAccess(email: string): Promise<AdminUser | null> {
    try {
      const admin = await this.getAdminByEmail(email);
      
      if (!admin || !admin.is_active) {
        return null;
      }

      return admin;
    } catch (error) {
      console.error('Erro ao validar acesso admin:', error);
      return null;
    }
  }

  // ==========================================
  // SUPABASE AUTH INTEGRATION
  // ==========================================

  async getCurrentAdmin(): Promise<AdminUser | null> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .rpc('get_current_admin');

      if (error) throw error;

      return data?.[0] || null;
    } catch (error) {
      console.error('Erro ao buscar admin atual:', error);
      return null;
    }
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .rpc('is_admin_user');

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar se é admin:', error);
      return false;
    }
  }

  async isCurrentUserSuperAdmin(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .rpc('is_super_admin');

      if (error) throw error;

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar se é super admin:', error);
      return false;
    }
  }

  async promoteUserToAdmin(
    email: string, 
    name: string, 
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .schema('payments')
        .rpc('promote_user_to_admin', {
          user_email: email,
          admin_name: name,
          admin_role: role
        });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao promover usuário a admin:', error);
      throw error;
    }
  }
}

// Função factory para criar instância quando necessário
export const createAdminService = (supabaseClient: any) => {
  return new AdminService(supabaseClient);
};

export type { AdminSession, AdminUser, CreateAdminUserData, UpdateAdminUserData };

