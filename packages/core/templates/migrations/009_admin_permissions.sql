-- ==========================================
-- MIGRATION: Admin Permissions Simplified
-- ==========================================
-- Políticas RLS simples: admin pode tudo, super_admin gerencia admins

-- ==========================================
-- PRODUCTS & PRICES - Admin Policies
-- ==========================================

-- Admins podem gerenciar products (todas as operações)
CREATE POLICY "Admins podem gerenciar products" ON payments.products
    FOR ALL USING (payments.is_admin_user());

-- Admins podem gerenciar prices (todas as operações) 
CREATE POLICY "Admins podem gerenciar prices" ON payments.prices
    FOR ALL USING (payments.is_admin_user());

-- ==========================================
-- PAGARME PAYMENTS - Admin Policies
-- ==========================================

-- Admins podem ver e modificar todos os payments do Pagar.me
CREATE POLICY "Admins podem gerenciar pagarme payments" ON payments.pagarme_payments
    FOR ALL USING (payments.is_admin_user());

-- ==========================================
-- ASAAS PAYMENTS - Admin Policies  
-- ==========================================

-- Admins podem ver e modificar todos os payments do Asaas
CREATE POLICY "Admins podem gerenciar asaas payments" ON payments.asaas_payments
    FOR ALL USING (payments.is_admin_user());

-- ==========================================
-- SUBSCRIPTIONS - Admin Policies
-- ==========================================

-- Admins podem gerenciar todas as subscriptions
CREATE POLICY "Admins podem gerenciar subscriptions" ON payments.subscriptions
    FOR ALL USING (payments.is_admin_user());

-- ==========================================
-- REFUND POLICIES - Admin Policies (se existir)
-- ==========================================

-- Verifica se a tabela refund_policies existe antes de criar policy
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'payments' AND table_name = 'refund_policies') THEN
        -- Admins podem gerenciar refund policies
        EXECUTE 'CREATE POLICY "Admins podem gerenciar refund policies" ON payments.refund_policies
            FOR ALL USING (payments.is_admin_user())';
    END IF;
END $$;

-- ==========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==========================================

COMMENT ON POLICY "Admins podem gerenciar products" ON payments.products IS 'Qualquer admin pode fazer CRUD completo em products';
COMMENT ON POLICY "Admins podem gerenciar prices" ON payments.prices IS 'Qualquer admin pode fazer CRUD completo em prices';
COMMENT ON POLICY "Admins podem gerenciar pagarme payments" ON payments.pagarme_payments IS 'Qualquer admin pode gerenciar payments do Pagar.me';
COMMENT ON POLICY "Admins podem gerenciar asaas payments" ON payments.asaas_payments IS 'Qualquer admin pode gerenciar payments do Asaas';
COMMENT ON POLICY "Admins podem gerenciar subscriptions" ON payments.subscriptions IS 'Qualquer admin pode gerenciar subscriptions';

-- ==========================================
-- SISTEMA SIMPLIFICADO
-- ==========================================

-- ROLES:
-- - admin: Pode gerenciar products, payments, subscriptions (tudo exceto outros admins)
-- - super_admin: Pode tudo, incluindo gerenciar outros admins
--
-- REGRA SIMPLES:
-- - payments.is_admin_user() = true para qualquer operação de negócio
-- - payments.is_super_admin() = true apenas para gerenciar admin_users
