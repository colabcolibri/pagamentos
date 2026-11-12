-- ==========================================
-- MIGRATION: Pagar.me Payments Table
-- ==========================================
-- Tabela para rastrear pagamentos via Pagar.me

CREATE TABLE IF NOT EXISTS payments.pagarme_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL, -- FK será adicionada na migration 010 após criação de profiles
    price_id uuid REFERENCES payments.prices(id) NOT NULL,
    product_id uuid REFERENCES payments.products(id) NOT NULL,
    subscription_id uuid REFERENCES payments.subscriptions(id) ON DELETE SET NULL, -- Null se for one-time payment
    
    -- Dados do Pagar.me
    payment_link_id text NOT NULL,
    payment_link_url text NOT NULL,
    -- order_id será adicionado na migration 013_orders_table.sql como UUID
    
    -- Status e valores
    status text DEFAULT 'pending',
    amount_cents integer NOT NULL,
    payment_method text, -- credit_card, pix, boleto
    paid_at timestamp with time zone,
    
    -- Informações adicionais
    boleto_url text,
    boleto_line text, -- Linha digitável do boleto
    boleto_barcode text, -- URL da imagem do código de barras
    pix_qr_code text, -- URL do QR Code do PIX (imagem)
    pix_code text, -- Código PIX copiável (string)
    expires_at timestamp with time zone,
    confirmation_email_sent_at timestamp with time zone,
    
    -- Metadata flexível
    metadata jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS pagarme_payments_user_id_idx ON payments.pagarme_payments(user_id);
CREATE INDEX IF NOT EXISTS pagarme_payments_price_id_idx ON payments.pagarme_payments(price_id);
CREATE INDEX IF NOT EXISTS pagarme_payments_product_id_idx ON payments.pagarme_payments(product_id);
CREATE INDEX IF NOT EXISTS pagarme_payments_status_idx ON payments.pagarme_payments(status);
CREATE INDEX IF NOT EXISTS pagarme_payments_payment_link_id_idx ON payments.pagarme_payments(payment_link_id);
-- order_id index será criado na migration 013_orders_table.sql
CREATE INDEX IF NOT EXISTS pagarme_payments_created_at_idx ON payments.pagarme_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS pagarme_payments_expires_at_idx ON payments.pagarme_payments(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE payments.pagarme_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Usuários podem ver apenas seus próprios payments
CREATE POLICY "Usuários podem ver seus próprios payments" 
    ON payments.pagarme_payments
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Service role pode fazer tudo
CREATE POLICY "Service role pode gerenciar payments" 
    ON payments.pagarme_payments
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_pagarme_payments_updated_at 
    BEFORE UPDATE ON payments.pagarme_payments
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Comments
COMMENT ON TABLE payments.pagarme_payments IS 'Pagamentos processados via Pagar.me (one-time ou recorrente)';
COMMENT ON COLUMN payments.pagarme_payments.subscription_id IS 'Null para pagamentos únicos, preenchido para subscriptions';
COMMENT ON COLUMN payments.pagarme_payments.payment_link_id IS 'ID do link de pagamento no Pagar.me';
-- order_id será adicionado na migration 013_orders_table.sql
COMMENT ON COLUMN payments.pagarme_payments.amount_cents IS 'Valor em centavos';
COMMENT ON COLUMN payments.pagarme_payments.status IS 'Status: pending, paid, failed, expired, etc';
COMMENT ON COLUMN payments.pagarme_payments.expires_at IS 'Data de expiração do link de pagamento';
