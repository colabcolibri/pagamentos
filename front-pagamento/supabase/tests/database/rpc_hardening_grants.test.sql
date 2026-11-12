-- pgTAP: privilégios das RPCs endurecidas (migration 20260413220627_harden_definer_rpc_privileges).
-- Rodar: na pasta front-pagamento, com Supabase local e migrações aplicadas: `pnpm test:db`
-- Requer extensão pgtap (habilitada por padrão em `supabase test db`).

BEGIN;

SELECT plan(9);

-- Assinatura alinhada à migration payments.upsert_profile (uuid + 17 text + jsonb)
-- (evita drift de oid entre ambientes)

-- get_sales_stats: só service_role executa (não anon / authenticated)
SELECT ok(
    has_function_privilege(
        'service_role',
        'payments.get_sales_stats(timestamp with time zone, timestamp with time zone)',
        'EXECUTE'
    ),
    'get_sales_stats: service_role tem EXECUTE'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'payments.get_sales_stats(timestamp with time zone, timestamp with time zone)',
        'EXECUTE'
    ),
    'get_sales_stats: authenticated não tem EXECUTE'
);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'payments.get_sales_stats(timestamp with time zone, timestamp with time zone)',
        'EXECUTE'
    ),
    'get_sales_stats: anon não tem EXECUTE'
);

-- cleanup_expired_payments: só service_role
SELECT ok(
    has_function_privilege(
        'service_role',
        'payments.cleanup_expired_payments()',
        'EXECUTE'
    ),
    'cleanup_expired_payments: service_role tem EXECUTE'
);

SELECT ok(
    NOT has_function_privilege(
        'authenticated',
        'payments.cleanup_expired_payments()',
        'EXECUTE'
    ),
    'cleanup_expired_payments: authenticated não tem EXECUTE'
);

SELECT ok(
    NOT has_function_privilege(
        'anon',
        'payments.cleanup_expired_payments()',
        'EXECUTE'
    ),
    'cleanup_expired_payments: anon não tem EXECUTE'
);

-- upsert_profile: checkout (authenticated) e backend (service_role) precisam de EXECUTE
SELECT ok(
    has_function_privilege(
        'authenticated',
        'payments.upsert_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb)',
        'EXECUTE'
    ),
    'upsert_profile: authenticated tem EXECUTE'
);

SELECT ok(
    has_function_privilege(
        'service_role',
        'payments.upsert_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb)',
        'EXECUTE'
    ),
    'upsert_profile: service_role tem EXECUTE'
);

-- recalc_stock_for_price: rota admin e triggers precisam de EXECUTE (guarda no corpo da função)
SELECT ok(
    has_function_privilege(
        'service_role',
        'payments.recalc_stock_for_price(uuid)',
        'EXECUTE'
    ),
    'recalc_stock_for_price: service_role tem EXECUTE'
);

SELECT * FROM finish();

ROLLBACK;
