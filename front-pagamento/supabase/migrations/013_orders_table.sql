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

-- ==========================================
-- Adicionar order_id nas tabelas de payments (UUID com NO ACTION para proteção fiscal)
-- ==========================================
-- CONFORMIDADE: Lei 12.741/2012, LGPD, Receita Federal
-- Pagamentos são DADOS FISCAIS PERMANENTES - não podem ser deletados

-- Pagar.me payments
ALTER TABLE payments.pagarme_payments 
    ADD COLUMN IF NOT EXISTS order_id uuid;

-- Criar índice antes da FK
CREATE INDEX IF NOT EXISTS pagarme_payments_order_id_idx 
    ON payments.pagarme_payments(order_id) WHERE order_id IS NOT NULL;

-- Adicionar FK com NO ACTION (protege dados fiscais)
ALTER TABLE payments.pagarme_payments 
    DROP CONSTRAINT IF EXISTS pagarme_payments_order_id_fkey;
    
ALTER TABLE payments.pagarme_payments 
    ADD CONSTRAINT pagarme_payments_order_id_fkey 
    FOREIGN KEY (order_id) 
    REFERENCES payments.orders(id) 
    ON DELETE NO ACTION;

COMMENT ON COLUMN payments.pagarme_payments.order_id IS 'UUID do pedido. FK com NO ACTION protege dados fiscais (Receita Federal)';
COMMENT ON CONSTRAINT pagarme_payments_order_id_fkey ON payments.pagarme_payments IS 
    'NO ACTION: Protege dados fiscais. Order com pagamento NÃO pode ser deletado';

-- Asaas payments
ALTER TABLE payments.asaas_payments 
    ADD COLUMN IF NOT EXISTS order_id uuid;

-- Criar índice antes da FK
CREATE INDEX IF NOT EXISTS asaas_payments_order_id_idx 
    ON payments.asaas_payments(order_id) WHERE order_id IS NOT NULL;

-- Adicionar FK com NO ACTION (protege dados fiscais)
ALTER TABLE payments.asaas_payments 
    DROP CONSTRAINT IF EXISTS asaas_payments_order_id_fkey;
    
ALTER TABLE payments.asaas_payments 
    ADD CONSTRAINT asaas_payments_order_id_fkey 
    FOREIGN KEY (order_id) 
    REFERENCES payments.orders(id) 
    ON DELETE NO ACTION;

COMMENT ON COLUMN payments.asaas_payments.order_id IS 'UUID do pedido. FK com NO ACTION protege dados fiscais (Receita Federal)';
COMMENT ON CONSTRAINT asaas_payments_order_id_fkey ON payments.asaas_payments IS 
    'NO ACTION: Protege dados fiscais. Order com pagamento NÃO pode ser deletado';

-- ==========================================
-- Proteção contra DELETE de pagamentos (compliance fiscal)
-- ==========================================

CREATE OR REPLACE FUNCTION payments.prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PROIBIDO: Pagamentos não podem ser deletados (dados fiscais). Use soft delete ou status.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = payments, public, auth;

-- Trigger para asaas_payments
DROP TRIGGER IF EXISTS prevent_asaas_payment_delete ON payments.asaas_payments;
CREATE TRIGGER prevent_asaas_payment_delete
    BEFORE DELETE ON payments.asaas_payments
    FOR EACH ROW
    EXECUTE FUNCTION payments.prevent_payment_delete();

-- Trigger para pagarme_payments  
DROP TRIGGER IF EXISTS prevent_pagarme_payment_delete ON payments.pagarme_payments;
CREATE TRIGGER prevent_pagarme_payment_delete
    BEFORE DELETE ON payments.pagarme_payments
    FOR EACH ROW
    EXECUTE FUNCTION payments.prevent_payment_delete();

COMMENT ON FUNCTION payments.prevent_payment_delete() IS 
    'Proteção HARD: Impede qualquer DELETE de pagamentos (compliance fiscal)';

-- ==========================================
-- SOFT DELETE para ORDERS
-- ==========================================
-- SOLUÇÃO: Não deletar orders, apenas marcar como deletado

ALTER TABLE payments.orders 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_orders_not_deleted 
    ON payments.orders(id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN payments.orders.deleted_at IS 
    'Soft delete: marcação de deleção ao invés de DELETE físico (protege pagamentos)';

-- Grant permissions
GRANT SELECT ON payments.orders TO authenticated;

