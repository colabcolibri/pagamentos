-- Restringe SELECT de webhook_url e webhook_secret para anon/authenticated.
-- service_role mantém acesso total (API admin, webhooks, server actions).

REVOKE SELECT ON TABLE payments.products FROM anon;
REVOKE SELECT ON TABLE payments.products FROM authenticated;

GRANT SELECT (
    id,
    ref,
    name,
    description,
    active,
    payment_methods,
    refund_policy,
    email_config,
    metadata,
    created_at,
    updated_at
) ON TABLE payments.products TO anon;

GRANT SELECT (
    id,
    ref,
    name,
    description,
    active,
    payment_methods,
    refund_policy,
    email_config,
    metadata,
    created_at,
    updated_at
) ON TABLE payments.products TO authenticated;

COMMENT ON COLUMN payments.products.webhook_url IS 'URL para webhook de pagamento confirmado. Visível apenas a service_role no Postgres; não expor em APIs públicas.';
COMMENT ON COLUMN payments.products.webhook_secret IS 'Secret HMAC. Visível apenas a service_role no Postgres; não expor em APIs públicas.';
