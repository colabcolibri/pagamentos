-- ==========================================
-- MIGRATION: Create Payments Schema
-- ==========================================
-- Schema dedicado para sistema de pagamentos

-- Criar schema
CREATE SCHEMA IF NOT EXISTS payments;

-- Comentário descritivo
COMMENT ON SCHEMA payments IS 'Sistema de pagamentos (Pagar.me, Asaas, produtos, preços e subscriptions)';

-- Grant permissions
GRANT USAGE ON SCHEMA payments TO anon;
GRANT USAGE ON SCHEMA payments TO authenticated;
GRANT ALL ON SCHEMA payments TO service_role;

-- Trigger function para updated_at (compartilhado)
CREATE OR REPLACE FUNCTION payments.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION payments.update_updated_at_column() IS 'Atualiza automaticamente a coluna updated_at';

