-- ==========================================
-- MIGRATION: Products and Prices Tables
-- ==========================================
-- Tabelas genéricas para gerenciar produtos e preços
-- Use o campo 'metadata' para dados específicos do seu negócio

-- Products Table
CREATE TABLE IF NOT EXISTS payments.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ref text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Prices Table
CREATE TABLE IF NOT EXISTS payments.prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ref text UNIQUE NOT NULL,
    product_id uuid REFERENCES payments.products(id) ON DELETE CASCADE,
    amount integer NOT NULL, -- Preço em centavos
    currency text DEFAULT 'BRL',
    recurring boolean DEFAULT false, -- true = assinatura, false = one-time
    interval text, -- 'month', 'year', null (se one-time)
    interval_count integer DEFAULT 1, -- a cada X intervalos
    active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS products_ref_idx ON payments.products(ref);
CREATE INDEX IF NOT EXISTS products_active_idx ON payments.products(active);
CREATE INDEX IF NOT EXISTS prices_ref_idx ON payments.prices(ref);
CREATE INDEX IF NOT EXISTS prices_product_id_idx ON payments.prices(product_id);
CREATE INDEX IF NOT EXISTS prices_active_idx ON payments.prices(active);
CREATE INDEX IF NOT EXISTS prices_recurring_idx ON payments.prices(recurring);

-- Grant SELECT para roles públicas
GRANT SELECT ON payments.products TO anon, authenticated;
GRANT SELECT ON payments.prices TO anon, authenticated;

-- Grant ALL para service_role (necessário para API routes)
GRANT USAGE ON SCHEMA payments TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA payments TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA payments TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA payments TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON FUNCTIONS TO service_role;

-- Enable RLS
ALTER TABLE payments.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permitir leitura pública de produtos ativos)
CREATE POLICY "Products ativos são visíveis para todos" ON payments.products
    FOR SELECT USING (active = true);

CREATE POLICY "Prices ativos são visíveis para todos" ON payments.prices
    FOR SELECT USING (active = true);

-- Apenas service_role pode modificar
CREATE POLICY "Apenas service_role pode modificar products" ON payments.products
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Apenas service_role pode modificar prices" ON payments.prices
    FOR ALL USING (auth.role() = 'service_role');

-- Triggers para atualizar updated_at
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON payments.products
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON payments.prices
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- ==========================================
-- PAYMENT METHODS (Métodos de Pagamento)
-- ==========================================

-- Coluna dedicada para métodos de pagamento permitidos (array JSON)
ALTER TABLE payments.products 
ADD COLUMN payment_methods JSONB DEFAULT '["credit_card", "pix", "boleto"]'::jsonb;

-- Constraint: validar que é um array
ALTER TABLE payments.products 
ADD CONSTRAINT valid_payment_methods 
CHECK (jsonb_typeof(payment_methods) = 'array');

-- GIN Index para queries rápidas (ex: WHERE payment_methods @> '["pix"]')
CREATE INDEX idx_products_payment_methods 
ON payments.products USING GIN (payment_methods);

-- Comments
COMMENT ON TABLE payments.products IS 'Produtos disponíveis para venda (genérico - use metadata para campos customizados)';
COMMENT ON TABLE payments.prices IS 'Preços dos produtos';
COMMENT ON COLUMN payments.products.metadata IS 'Campos customizados do seu negócio (ex: {type: "course", duration_days: 30})';
COMMENT ON COLUMN payments.products.payment_methods IS 'Métodos de pagamento permitidos (ex: ["credit_card", "pix", "boleto", "asaas_boleto_parcelado"])';
COMMENT ON COLUMN payments.prices.amount IS 'Preço em centavos (ex: 99000 = R$ 990,00)';
COMMENT ON COLUMN payments.prices.recurring IS 'true = assinatura recorrente, false = pagamento único';
COMMENT ON COLUMN payments.prices.interval IS 'Intervalo de recorrência: day, week, month, year (null se one-time)';
COMMENT ON COLUMN payments.prices.metadata IS 'Campos customizados (ex: {cash_discount: 10, max_installments: 12})';

-- Exemplo de uso do metadata em products:
-- {
--   "type": "course",           // Tipo específico do seu negócio
--   "duration_days": 365,       // Duração customizada
--   "target_plan": "premium",   // Plano que ativa
--   "features": ["feature1"]    // Lista de features
-- }

-- Exemplo de uso do payment_methods em products:
-- ["credit_card", "pix", "boleto"]              // Permite cartão, PIX e boleto (padrão)
-- ["credit_card", "pix"]                        // Permite apenas cartão e PIX
-- ["asaas_boleto_parcelado"]                    // Permite APENAS boleto parcelado
-- ["credit_card", "pix", "boleto", "asaas_boleto_parcelado"]  // Permite tudo

-- Exemplo de uso do metadata em prices:
-- {
--   "cash_discount": 10.0,      // Desconto à vista em %
--   "max_installments": 12,     // Máximo de parcelas
--   "trial_days": 7             // Dias de trial
-- }

-- ==========================================
-- GRANT: Permissões para roles do Supabase
-- ==========================================

-- Conceder acesso ao schema para roles autenticados e service_role
GRANT USAGE ON SCHEMA payments TO authenticated, service_role;

-- Conceder permissões em todas as tabelas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA payments TO authenticated, service_role;

-- Conceder permissões em todas as funções
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA payments TO authenticated, service_role;

-- Conceder permissões em todas as sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA payments TO authenticated, service_role;

-- Garantir que tabelas/funções/sequences futuras herdem essas permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON FUNCTIONS TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA payments GRANT ALL ON SEQUENCES TO authenticated, service_role;
