-- ==========================================
-- Incluir profile (nome, email) na view orders_with_relations
-- Para que listagem e detalhe de pedidos no admin mostrem cliente corretamente
-- ==========================================
DROP VIEW IF EXISTS payments.orders_with_relations;

CREATE OR REPLACE VIEW payments.orders_with_relations AS
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
    p.id AS product_id_rel,
    p.name AS product_name,
    p.ref AS product_ref,
    p.description AS product_description,
    -- Preço relacionado
    pr.id AS price_id_rel,
    pr.amount AS price_amount,
    pr.currency AS price_currency,
    pr.recurring AS price_recurring,
    pr.interval AS price_interval,
    pr.interval_count AS price_interval_count,
    -- Perfil do cliente (orders.user_id = profiles.id)
    prof.id AS profile_id,
    prof.email AS profile_email,
    prof.name AS profile_name
FROM payments.orders o
LEFT JOIN payments.products p ON p.id = o.product_id
LEFT JOIN payments.prices pr ON pr.id = o.price_id
LEFT JOIN payments.profiles prof ON prof.id = o.user_id;

GRANT SELECT ON payments.orders_with_relations TO authenticated;

COMMENT ON VIEW payments.orders_with_relations IS 'Orders com produto, preço e perfil do cliente. Herda RLS de payments.orders.';
