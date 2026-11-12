-- ==========================================
-- MIGRATION: Admin Users & Sessions
-- Descrição: Sistema de administradores para o painel admin
-- ==========================================

-- Tabela de usuários administradores (integrada com Supabase Auth)
CREATE TABLE payments.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION payments.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- Índices para performance
CREATE INDEX idx_admin_users_email ON payments.admin_users(email);
CREATE INDEX idx_admin_users_active ON payments.admin_users(is_active);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION payments.update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = payments, public, auth;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_admin_users_updated_at
    BEFORE UPDATE ON payments.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_admin_updated_at();

-- Função para validar se usuário atual é admin
CREATE OR REPLACE FUNCTION payments.is_admin_user() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users 
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- Função para validar se usuário atual é super admin
CREATE OR REPLACE FUNCTION payments.is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users 
        WHERE id = auth.uid() AND is_active = true AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- Função para obter dados do admin atual
CREATE OR REPLACE FUNCTION payments.get_current_admin()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT au.id, au.email, au.name, au.role, au.is_active
    FROM payments.admin_users au
    WHERE au.id = auth.uid() AND au.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;

-- RLS (Row Level Security) para segurança
ALTER TABLE payments.admin_users ENABLE ROW LEVEL SECURITY;

-- Política RLS - apenas admins podem ver/editar dados de admin
CREATE POLICY admin_users_select_policy ON payments.admin_users
    FOR SELECT USING (payments.is_admin_user());

CREATE POLICY admin_users_insert_policy ON payments.admin_users
    FOR INSERT WITH CHECK (payments.is_super_admin());

CREATE POLICY admin_users_update_policy ON payments.admin_users
    FOR UPDATE USING (payments.is_super_admin());

CREATE POLICY admin_users_delete_policy ON payments.admin_users
    FOR DELETE USING (payments.is_super_admin());

-- Comentários para documentação
COMMENT ON TABLE payments.admin_users IS 'Usuários administradores do painel de pagamentos (integrado com Supabase Auth)';
COMMENT ON COLUMN payments.admin_users.id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN payments.admin_users.role IS 'Nível de acesso: admin (tudo exceto user_management) ou super_admin (tudo)';
COMMENT ON FUNCTION payments.is_admin_user() IS 'Verifica se o usuário atual é admin ativo';
COMMENT ON FUNCTION payments.is_super_admin() IS 'Verifica se o usuário atual é super admin';
COMMENT ON FUNCTION payments.get_current_admin() IS 'Retorna dados do admin atual autenticado';

-- ==========================================
-- ADMIN POLICIES: Permissões para admins gerenciarem recursos
-- ==========================================

-- Products & Prices
CREATE POLICY "Admins podem gerenciar products" ON payments.products
    FOR ALL USING (payments.is_admin_user());

CREATE POLICY "Admins podem gerenciar prices" ON payments.prices
    FOR ALL USING (payments.is_admin_user());

-- Subscriptions
CREATE POLICY "Admins podem gerenciar subscriptions" ON payments.subscriptions
    FOR ALL USING (payments.is_admin_user());

-- Payments
CREATE POLICY "Admins podem gerenciar pagarme payments" ON payments.pagarme_payments
    FOR ALL USING (payments.is_admin_user());

CREATE POLICY "Admins podem gerenciar asaas payments" ON payments.asaas_payments
    FOR ALL USING (payments.is_admin_user());
