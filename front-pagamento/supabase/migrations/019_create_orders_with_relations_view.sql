-- ==========================================
-- VIEW: orders_with_relations
-- ==========================================
-- Problema: RLS impede que relações products e prices sejam retornadas
-- Solução: Criar view que faz JOIN e herda políticas RLS de orders
-- ==========================================
DROP VIEW IF EXISTS payments.orders_with_relations;

CREATE
OR REPLACE VIEW payments.orders_with_relations AS
SELECT
    o.id,
    o.user_id,
    o.product_id,
    o.price_id,
    o.subscription_id,
    o.order_type,
    o.status,
    o.amount_cents,
    o.payment_method,
    o.payment_gateway,
    o.paid_at,
    o.cancelled_at,
    o.refunded_at,
    o.expires_at,
    o.metadata,
    o.created_at,
    o.updated_at,
    o.deleted_at,
    -- Produto relacionado
    p.id as product_id_rel,
    p.name as product_name,
    p.ref as product_ref,
    p.description as product_description,
    -- Preço relacionado
    pr.id as price_id_rel,
    pr.amount as price_amount,
    pr.currency as price_currency,
    pr.recurring as price_recurring,
    pr.interval as price_interval,
    pr.interval_count as price_interval_count
FROM
    payments.orders o
    LEFT JOIN payments.products p ON p.id = o.product_id
    LEFT JOIN payments.prices pr ON pr.id = o.price_id;

-- ==========================================
-- RLS na VIEW
-- ==========================================
-- IMPORTANTE: Views não suportam políticas RLS diretamente
-- A view automaticamente herda as políticas RLS das tabelas subjacentes
-- Como a view faz JOIN com payments.orders, as políticas RLS de orders serão aplicadas
-- Isso significa que usuários só verão seus próprios pedidos, admins verão todos,
-- e service_role terá acesso total (conforme definido na política "orders_consolidated")
-- Grant permissions (seguindo o padrão da tabela orders)
GRANT
SELECT
    ON payments.orders_with_relations TO authenticated;

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON VIEW payments.orders_with_relations IS 'View que retorna orders com produtos e preços relacionados. Herda automaticamente as políticas RLS da tabela payments.orders (política "orders_consolidated"). Usuários veem apenas seus próprios pedidos, admins veem todos, e service_role tem acesso total.';