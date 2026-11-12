-- ==========================================
-- MIGRATION: Asaas Payments Table
-- ==========================================
-- Tabela para rastrear pagamentos via Asaas no schema payments

CREATE TABLE IF NOT EXISTS payments.asaas_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id uuid REFERENCES payments.subscriptions(id) ON DELETE CASCADE NOT NULL,
    price_id uuid REFERENCES payments.prices(id) NOT NULL,
    product_id uuid REFERENCES payments.products(id) NOT NULL,
    
    -- IDs Asaas
    asaas_customer_id text NOT NULL, -- ID do cliente no Asaas
    asaas_payment_id text, -- ID do pagamento único (quando não é parcelado)
    asaas_installment_id text, -- ID do parcelamento (quando é boleto parcelado)
    
    -- Tipo de cobrança
    billing_type text NOT NULL, -- BOLETO, PIX, CREDIT_CARD
    
    -- Valores e parcelas
    amount_cents integer NOT NULL,
    installments integer DEFAULT 1, -- Número de parcelas (1 = pagamento único)
    installments_data jsonb, -- Dados das parcelas retornadas pelo Asaas (quando parcelado)
    
    -- Datas
    due_date timestamp with time zone, -- Data de vencimento (pagamento único)
    paid_at timestamp with time zone,
    
    -- Status e método
    status text DEFAULT 'pending',
    payment_method text, -- Método usado após pagamento (preenchido pelo webhook)
    
    -- URLs
    boleto_url text,
    pix_qr_code text,
    
    -- Metadata e controle de email
    metadata jsonb DEFAULT '{}'::jsonb,
    confirmation_email_sent_at timestamp with time zone,
    
    -- Reembolso
    refund_amount integer,
    refunded_at timestamp with time zone,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    CONSTRAINT asaas_payment_id_or_installment_id_required 
        CHECK (asaas_payment_id IS NOT NULL OR asaas_installment_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS asaas_payments_user_id_idx ON payments.asaas_payments(user_id);
CREATE INDEX IF NOT EXISTS asaas_payments_subscription_id_idx ON payments.asaas_payments(subscription_id);
CREATE INDEX IF NOT EXISTS asaas_payments_product_id_idx ON payments.asaas_payments(product_id);
CREATE INDEX IF NOT EXISTS asaas_payments_status_idx ON payments.asaas_payments(status);
CREATE INDEX IF NOT EXISTS asaas_payments_asaas_payment_id_idx ON payments.asaas_payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS asaas_payments_asaas_installment_id_idx ON payments.asaas_payments(asaas_installment_id);
CREATE INDEX IF NOT EXISTS asaas_payments_asaas_customer_id_idx ON payments.asaas_payments(asaas_customer_id);

-- Enable RLS
ALTER TABLE payments.asaas_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Usuários podem ver apenas seus próprios payments
CREATE POLICY "Usuários podem ver seus próprios payments" 
    ON payments.asaas_payments
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Service role pode fazer tudo
CREATE POLICY "Service role pode gerenciar payments" 
    ON payments.asaas_payments
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Trigger
CREATE TRIGGER update_asaas_payments_updated_at 
    BEFORE UPDATE ON payments.asaas_payments
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Comments
COMMENT ON TABLE payments.asaas_payments IS 'Pagamentos processados via Asaas (únicos e parcelados)';
COMMENT ON COLUMN payments.asaas_payments.subscription_id IS 'Referência para a subscription criada';
COMMENT ON COLUMN payments.asaas_payments.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN payments.asaas_payments.asaas_payment_id IS 'ID do pagamento único no Asaas (quando não parcelado)';
COMMENT ON COLUMN payments.asaas_payments.asaas_installment_id IS 'ID do parcelamento no Asaas (quando boleto parcelado)';
COMMENT ON COLUMN payments.asaas_payments.billing_type IS 'Tipo de cobrança: BOLETO, PIX, CREDIT_CARD';
COMMENT ON COLUMN payments.asaas_payments.installments IS 'Número de parcelas (1 = pagamento único, 2-12 = parcelado)';
COMMENT ON COLUMN payments.asaas_payments.installments_data IS 'Dados completos das parcelas retornadas pelo Asaas (array de objetos)';
COMMENT ON COLUMN payments.asaas_payments.due_date IS 'Data de vencimento (apenas para pagamento único)';
COMMENT ON COLUMN payments.asaas_payments.payment_method IS 'Método de pagamento usado (preenchido após confirmação)';
COMMENT ON COLUMN payments.asaas_payments.metadata IS 'Dados adicionais: customerData, refund_policy, etc';
COMMENT ON COLUMN payments.asaas_payments.confirmation_email_sent_at IS 'Data de envio do email de confirmação';

-- Garantir que authenticated pode acessar a tabela
GRANT SELECT ON payments.asaas_payments TO authenticated;
GRANT INSERT ON payments.asaas_payments TO service_role;
GRANT UPDATE ON payments.asaas_payments TO service_role;

