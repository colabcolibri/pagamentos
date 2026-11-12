-- ==========================================
-- MIGRATION: Orders Table (Pedidos)
-- ==========================================
-- Tabela central para todos os pedidos (subscription ou one-time)

CREATE TABLE IF NOT EXISTS payments.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    
    -- Relacionamentos
    subscription_id uuid REFERENCES payments.subscriptions(id) ON DELETE SET NULL, -- Null para pedidos avulsos
    product_id uuid REFERENCES payments.products(id) NOT NULL,
    price_id uuid REFERENCES payments.prices(id) NOT NULL,
    
    -- Tipo e status do pedido
    order_type text NOT NULL CHECK (order_type IN ('subscription', 'one_time')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired')),
    
    -- Informações de pagamento
    amount_cents integer NOT NULL,
    payment_method text, -- pix, boleto, credit_card
    payment_gateway text NOT NULL CHECK (payment_gateway IN ('pagarme', 'asaas')),
    
    -- Timestamps
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    refunded_at timestamp with time zone,
    expires_at timestamp with time zone,
    
    -- Snapshot da política de reembolso vigente (compliance legal)
    refund_policy_snapshot jsonb NOT NULL,
    
    -- Metadata flexível
    metadata jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON payments.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_subscription_id_idx ON payments.orders(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_product_id_idx ON payments.orders(product_id);
CREATE INDEX IF NOT EXISTS orders_price_id_idx ON payments.orders(price_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON payments.orders(status);
CREATE INDEX IF NOT EXISTS orders_order_type_idx ON payments.orders(order_type);
CREATE INDEX IF NOT EXISTS orders_payment_gateway_idx ON payments.orders(payment_gateway);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON payments.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_paid_at_idx ON payments.orders(paid_at DESC) WHERE paid_at IS NOT NULL;

-- Enable RLS
ALTER TABLE payments.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Usuários podem ver apenas seus próprios orders
CREATE POLICY "Usuários podem ver seus próprios orders" 
    ON payments.orders
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Service role pode fazer tudo
CREATE POLICY "Service role pode gerenciar orders" 
    ON payments.orders
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON payments.orders
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Comments
COMMENT ON TABLE payments.orders IS 'Pedidos centralizados (subscription ou one-time)';
COMMENT ON COLUMN payments.orders.subscription_id IS 'Null para pedidos avulsos (one-time)';
COMMENT ON COLUMN payments.orders.order_type IS 'Tipo: subscription (recorrente) ou one_time (avulso)';
COMMENT ON COLUMN payments.orders.status IS 'Status do pedido: pending, paid, failed, cancelled, refunded, expired';
COMMENT ON COLUMN payments.orders.payment_method IS 'Método usado: pix, boleto, credit_card';
COMMENT ON COLUMN payments.orders.payment_gateway IS 'Gateway: pagarme ou asaas';
COMMENT ON COLUMN payments.orders.amount_cents IS 'Valor em centavos';
COMMENT ON COLUMN payments.orders.refund_policy_snapshot IS 'Snapshot IMUTÁVEL da política de reembolso vigente no momento da compra. Campo obrigatório para compliance legal e disputas. NUNCA deve ser alterado após a criação do pedido.';

-- ==========================================
-- Adicionar order_id nas tabelas de payments
-- ==========================================

-- Pagar.me payments
ALTER TABLE payments.pagarme_payments 
    ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES payments.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pagarme_payments_order_id_idx ON payments.pagarme_payments(order_id) WHERE order_id IS NOT NULL;

COMMENT ON COLUMN payments.pagarme_payments.order_id IS 'Referência ao pedido centralizado';

-- Asaas payments
ALTER TABLE payments.asaas_payments 
    ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES payments.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS asaas_payments_order_id_idx ON payments.asaas_payments(order_id) WHERE order_id IS NOT NULL;

COMMENT ON COLUMN payments.asaas_payments.order_id IS 'Referência ao pedido centralizado';

-- Grant permissions
GRANT SELECT ON payments.orders TO authenticated;

