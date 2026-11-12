-- ==========================================
-- Hardening: RPCs SECURITY DEFINER (IDOR, métricas, estoque, limpeza)
-- Documentação: docs/guides/quitou/rpc-privileges-defense.md
-- ==========================================

-- ─── 1. upsert_profile — amarra user_id ao auth.uid() ou admin ───────────────

CREATE OR REPLACE FUNCTION payments.upsert_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_phone TEXT DEFAULT NULL,
    user_person_type TEXT DEFAULT 'individual',
    user_document TEXT DEFAULT NULL,
    user_company_name TEXT DEFAULT NULL,
    user_company_document TEXT DEFAULT NULL,
    user_state_registration TEXT DEFAULT NULL,
    user_municipal_registration TEXT DEFAULT NULL,
    user_billing_street TEXT DEFAULT NULL,
    user_billing_number TEXT DEFAULT NULL,
    user_billing_complement TEXT DEFAULT NULL,
    user_billing_neighborhood TEXT DEFAULT NULL,
    user_billing_city TEXT DEFAULT NULL,
    user_billing_state TEXT DEFAULT NULL,
    user_billing_zip TEXT DEFAULT NULL,
    user_billing_country TEXT DEFAULT 'BR',
    user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS payments.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result payments.profiles;
BEGIN
    -- Checkout e jobs usam service_role (auth.uid() costuma ser nulo); usuário comum só o próprio id; admin pode outro perfil.
    IF (SELECT auth.role()) IS DISTINCT FROM 'service_role'
       AND (SELECT auth.uid()) IS DISTINCT FROM user_id
       AND NOT (SELECT payments.is_admin_user()) THEN
        RAISE EXCEPTION 'upsert_profile: só é permitido atualizar o próprio perfil, service_role ou atuar como admin'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO payments.profiles (
        id,
        email,
        name,
        phone,
        person_type,
        document,
        company_name,
        company_document,
        state_registration,
        municipal_registration,
        billing_street,
        billing_number,
        billing_complement,
        billing_neighborhood,
        billing_city,
        billing_state,
        billing_zip,
        billing_country,
        metadata
    ) VALUES (
        user_id,
        user_email,
        user_name,
        user_phone,
        user_person_type,
        user_document,
        user_company_name,
        user_company_document,
        user_state_registration,
        user_municipal_registration,
        user_billing_street,
        user_billing_number,
        user_billing_complement,
        user_billing_neighborhood,
        user_billing_city,
        user_billing_state,
        user_billing_zip,
        user_billing_country,
        user_metadata
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, payments.profiles.phone),
        person_type = COALESCE(EXCLUDED.person_type, payments.profiles.person_type),
        document = COALESCE(EXCLUDED.document, payments.profiles.document),
        company_name = COALESCE(EXCLUDED.company_name, payments.profiles.company_name),
        company_document = COALESCE(EXCLUDED.company_document, payments.profiles.company_document),
        state_registration = COALESCE(EXCLUDED.state_registration, payments.profiles.state_registration),
        municipal_registration = COALESCE(EXCLUDED.municipal_registration, payments.profiles.municipal_registration),
        billing_street = COALESCE(EXCLUDED.billing_street, payments.profiles.billing_street),
        billing_number = COALESCE(EXCLUDED.billing_number, payments.profiles.billing_number),
        billing_complement = COALESCE(EXCLUDED.billing_complement, payments.profiles.billing_complement),
        billing_neighborhood = COALESCE(EXCLUDED.billing_neighborhood, payments.profiles.billing_neighborhood),
        billing_city = COALESCE(EXCLUDED.billing_city, payments.profiles.billing_city),
        billing_state = COALESCE(EXCLUDED.billing_state, payments.profiles.billing_state),
        billing_zip = COALESCE(EXCLUDED.billing_zip, payments.profiles.billing_zip),
        billing_country = COALESCE(EXCLUDED.billing_country, payments.profiles.billing_country),
        metadata = payments.profiles.metadata || EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$;

-- ─── 2. get_sales_stats — apenas service_role ───────────────────────────────

CREATE OR REPLACE FUNCTION payments.get_sales_stats(
    p_start_date timestamp with time zone DEFAULT NULL,
    p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
    total_sales bigint,
    total_revenue bigint,
    avg_ticket numeric,
    conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'get_sales_stats: apenas service_role'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::bigint AS total_sales,
        SUM(amount_cents)::bigint AS total_revenue,
        AVG(amount_cents)::numeric AS avg_ticket,
        (COUNT(*) FILTER (WHERE status = 'paid')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100) AS conversion_rate
    FROM payments.pagarme_payments
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

REVOKE ALL ON FUNCTION payments.get_sales_stats(timestamp with time zone, timestamp with time zone) FROM PUBLIC;

REVOKE ALL ON FUNCTION payments.get_sales_stats(timestamp with time zone, timestamp with time zone) FROM anon;

REVOKE ALL ON FUNCTION payments.get_sales_stats(timestamp with time zone, timestamp with time zone) FROM authenticated;

GRANT EXECUTE ON FUNCTION payments.get_sales_stats(timestamp with time zone, timestamp with time zone) TO service_role;

COMMENT ON FUNCTION payments.get_sales_stats(timestamp with time zone, timestamp with time zone) IS 'Estatísticas globais Pagar.me; apenas service_role (PostgREST com chave de serviço).';

-- ─── 3. cleanup_expired_payments — apenas service_role (UPDATE soft) ───────

CREATE OR REPLACE FUNCTION payments.cleanup_expired_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'cleanup_expired_payments: apenas service_role'
            USING ERRCODE = '42501';
    END IF;

    UPDATE payments.pagarme_payments
    SET status = 'expired',
        updated_at = now()
    WHERE status IN ('pending', 'incomplete')
        AND expires_at < now()
        AND created_at < now() - interval '30 days';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION payments.cleanup_expired_payments() FROM PUBLIC;

REVOKE ALL ON FUNCTION payments.cleanup_expired_payments() FROM anon;

REVOKE ALL ON FUNCTION payments.cleanup_expired_payments() FROM authenticated;

GRANT EXECUTE ON FUNCTION payments.cleanup_expired_payments() TO service_role;

COMMENT ON FUNCTION payments.cleanup_expired_payments() IS 'Marca pagamentos pendentes expirados como expired; apenas service_role.';

-- ─── 4. recalc_stock_for_price — bloquear RPC direto; manter trigger / admin ─

CREATE OR REPLACE FUNCTION payments.recalc_stock_for_price(p_price_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
    v_paid_count integer;
BEGIN
    IF pg_trigger_depth() < 1
        AND (SELECT auth.role()) IS DISTINCT FROM 'service_role'
        AND NOT (SELECT payments.is_admin_user()) THEN
        RAISE EXCEPTION 'recalc_stock_for_price: acesso negado'
            USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*)::integer
    INTO v_paid_count
    FROM payments.orders
    WHERE price_id = p_price_id
        AND status = 'paid';

    UPDATE payments.prices
    SET stock_sold = v_paid_count
    WHERE id = p_price_id;

    UPDATE payments.price_promo_tiers pt
    SET units_sold = (
        SELECT COUNT(*)::integer
        FROM payments.orders o
        WHERE o.price_id = p_price_id
            AND o.status = 'paid'
            AND (pt.ends_at IS NULL OR o.created_at <= pt.ends_at)
    )
    WHERE pt.price_id = p_price_id;
END;
$$;

COMMENT ON FUNCTION payments.recalc_stock_for_price(uuid) IS 'Recalcula stock_sold/units_sold; permitido via trigger em orders, service_role ou admin (não usuário comum por RPC direto).';
