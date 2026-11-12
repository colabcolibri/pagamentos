-- ==========================================
-- CORREÇÃO: Function Search Path Mutable
-- ==========================================
-- Este arquivo corrige todas as funções do schema payments
-- adicionando SET search_path = '' para segurança
-- ==========================================

-- ==========================================
-- 1. payments.update_updated_at_column
-- ==========================================

CREATE OR REPLACE FUNCTION payments.update_updated_at_column()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 2. payments.get_pending_pagarme_payment
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_pending_pagarme_payment(
    p_user_id uuid,
    p_product_ref text
)
RETURNS TABLE (
    id uuid,
    payment_link_url text,
    expires_at timestamp with time zone,
    status text
) 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.id,
        pp.payment_link_url,
        pp.expires_at,
        pp.status
    FROM payments.pagarme_payments pp
    INNER JOIN payments.products p ON pp.product_id = p.id
    INNER JOIN payments.prices pr ON p.id = pr.product_id
    WHERE pp.user_id = p_user_id
        AND pr.ref = p_product_ref
        AND pp.status IN ('pending', 'boleto_generated', 'pix_generated', 'incomplete')
        AND (pp.expires_at IS NULL OR pp.expires_at > now())
    ORDER BY pp.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. payments.get_sales_stats
-- ==========================================

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
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_sales,
        SUM(amount_cents)::bigint as total_revenue,
        AVG(amount_cents)::numeric as avg_ticket,
        (COUNT(*) FILTER (WHERE status = 'paid')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100) as conversion_rate
    FROM payments.pagarme_payments
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. payments.cleanup_expired_payments
-- ==========================================

CREATE OR REPLACE FUNCTION payments.cleanup_expired_payments()
RETURNS integer
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM payments.pagarme_payments
    WHERE status IN ('pending', 'incomplete')
        AND expires_at < now()
        AND created_at < now() - interval '30 days'; -- Só apaga após 30 dias
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. payments.is_admin_user
-- ==========================================

CREATE OR REPLACE FUNCTION payments.is_admin_user()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users
        WHERE id = (select auth.uid()) AND is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. payments.update_admin_updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION payments.update_admin_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. payments.is_super_admin
-- ==========================================

CREATE OR REPLACE FUNCTION payments.is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users 
        WHERE id = (select auth.uid()) AND is_active = true AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. payments.get_current_admin
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_current_admin()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    is_active BOOLEAN
)
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT au.id, au.email, au.name, au.role, au.is_active
    FROM payments.admin_users au
    WHERE au.id = (select auth.uid()) AND au.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. payments.upsert_profile
-- ==========================================

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
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result payments.profiles;
BEGIN
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
$$ LANGUAGE plpgsql;

-- ==========================================
-- 10. payments.get_current_profile
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_current_profile()
RETURNS payments.profiles
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result payments.profiles;
BEGIN
    SELECT * INTO result
    FROM payments.profiles
    WHERE id = (select auth.uid());

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 11. payments.handle_new_user
-- ==========================================

CREATE OR REPLACE FUNCTION payments.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO payments.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 12. payments.validate_refund_policy
-- ==========================================

CREATE OR REPLACE FUNCTION payments.validate_refund_policy(policy jsonb)
RETURNS boolean
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF policy IS NULL THEN
    RETURN true;
  END IF;

  IF NOT (
    policy ? 'title' AND
    policy ? 'subtitle' AND
    policy ? 'sections' AND
    policy ? 'footer' AND
    policy ? 'checkout'
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(policy->'sections') != 'array' THEN
    RETURN false;
  END IF;

  IF NOT (
    policy->'checkout' ? 'buttonText' AND
    policy->'checkout' ? 'acceptanceText' AND
    policy->'checkout' ? 'acceptanceRequired'
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 13. payments.get_product_refund_policy
-- ==========================================

CREATE OR REPLACE FUNCTION payments.get_product_refund_policy(product_ref text)
RETURNS jsonb
STABLE
SET search_path = ''
AS $$
  SELECT metadata->'refund_policy'
  FROM payments.products
  WHERE ref = product_ref
  LIMIT 1;
$$ LANGUAGE sql;

-- ==========================================
-- 14. payments.prevent_payment_delete
-- ==========================================

CREATE OR REPLACE FUNCTION payments.prevent_payment_delete()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'PROIBIDO: Pagamentos não podem ser deletados (dados fiscais). Use soft delete ou status.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

