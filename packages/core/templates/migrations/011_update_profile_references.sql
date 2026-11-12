-- ==========================================
-- MIGRATION: Atualizar referências para payments.profiles
-- ==========================================
-- Atualiza foreign keys de auth.users para payments.profiles nas tabelas relacionadas

-- ==========================================
-- ATUALIZAR: subscriptions
-- ==========================================

-- Remover constraint antiga
ALTER TABLE payments.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Adicionar nova constraint referenciando payments.profiles
ALTER TABLE payments.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES payments.profiles(id)
    ON DELETE CASCADE;

-- ==========================================
-- ATUALIZAR: pagarme_payments
-- ==========================================

-- Adicionar coluna user_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'payments'
        AND table_name = 'pagarme_payments'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE payments.pagarme_payments
            ADD COLUMN user_id UUID REFERENCES payments.profiles(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_pagarme_payments_user_id ON payments.pagarme_payments(user_id);
        
        COMMENT ON COLUMN payments.pagarme_payments.user_id IS 'Referência para o profile do usuário que fez o pagamento';
    END IF;
END $$;

-- ==========================================
-- ATUALIZAR: asaas_payments
-- ==========================================

-- Adicionar coluna user_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'payments'
        AND table_name = 'asaas_payments'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE payments.asaas_payments
            ADD COLUMN user_id UUID REFERENCES payments.profiles(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_asaas_payments_user_id ON payments.asaas_payments(user_id);
        
        COMMENT ON COLUMN payments.asaas_payments.user_id IS 'Referência para o profile do usuário que fez o pagamento';
    END IF;
END $$;

-- ==========================================
-- RLS: Adicionar políticas para usuários
-- ==========================================

-- Usuários podem ver apenas suas próprias subscriptions
DROP POLICY IF EXISTS "Usuários podem ver suas subscriptions" ON payments.subscriptions;
CREATE POLICY "Usuários podem ver suas subscriptions" ON payments.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem ver apenas seus próprios pagamentos Pagar.me
DROP POLICY IF EXISTS "Usuários podem ver seus pagamentos Pagar.me" ON payments.pagarme_payments;
CREATE POLICY "Usuários podem ver seus pagamentos Pagar.me" ON payments.pagarme_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem ver apenas seus próprios pagamentos Asaas
DROP POLICY IF EXISTS "Usuários podem ver seus pagamentos Asaas" ON payments.asaas_payments;
CREATE POLICY "Usuários podem ver seus pagamentos Asaas" ON payments.asaas_payments
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- COMENTÁRIOS
-- ==========================================

COMMENT ON CONSTRAINT subscriptions_user_id_fkey ON payments.subscriptions
    IS 'Referência para payments.profiles em vez de auth.users diretamente';

