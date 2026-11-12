-- ==========================================
-- MIGRATION: Subscriptions Table (OPCIONAL)
-- ==========================================
-- Tabela para assinaturas recorrentes
-- ATENÇÃO: Só use se você vende assinaturas recorrentes
-- Para pagamentos únicos (one-time), você não precisa desta tabela

-- Enum para status da subscription
DO $$ BEGIN
    CREATE TYPE payments.subscription_status AS ENUM (
        'incomplete',
        'active',
        'past_due',
        'canceled',
        'unpaid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS payments.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    price_id uuid REFERENCES payments.prices(id) NOT NULL,
    status payments.subscription_status DEFAULT 'incomplete',
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    canceled_at timestamp with time zone,
    trial_end timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON payments.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON payments.subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_price_id_idx ON payments.subscriptions(price_id);
CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx ON payments.subscriptions(current_period_end);

-- Enable RLS
ALTER TABLE payments.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários podem ver suas próprias subscriptions" 
    ON payments.subscriptions
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service role pode gerenciar subscriptions" 
    ON payments.subscriptions
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON payments.subscriptions
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Comments
COMMENT ON TABLE payments.subscriptions IS 'Assinaturas recorrentes (opcional - só use se vende subscriptions)';
COMMENT ON COLUMN payments.subscriptions.status IS 'Status: incomplete, active, past_due, canceled, unpaid';
COMMENT ON COLUMN payments.subscriptions.cancel_at_period_end IS 'Se true, cancela ao fim do período atual';
COMMENT ON COLUMN payments.subscriptions.trial_end IS 'Fim do período de trial gratuito';
COMMENT ON COLUMN payments.subscriptions.metadata IS 'Dados customizados da subscription';
