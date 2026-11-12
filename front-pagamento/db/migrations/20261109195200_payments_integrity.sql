-- Funções de integridade do schema payments, sem auth.uid, auth.role nem papéis do Supabase.
-- A autorização fica na aplicação. Estas funções só protegem dado.

CREATE OR REPLACE FUNCTION payments.recalc_stock_for_price(p_price_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
    v_paid_count integer;
BEGIN
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

CREATE OR REPLACE FUNCTION payments.sync_stock_sold_from_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
    v_price_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_price_id := OLD.price_id;
    ELSIF TG_OP = 'INSERT' THEN
        v_price_id := NEW.price_id;
    ELSE
        IF OLD.price_id IS DISTINCT FROM NEW.price_id AND OLD.price_id IS NOT NULL THEN
            PERFORM payments.recalc_stock_for_price(OLD.price_id);
        END IF;
        v_price_id := NEW.price_id;
    END IF;

    IF v_price_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    PERFORM payments.recalc_stock_for_price(v_price_id);
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_stock_sold ON payments.orders;
CREATE TRIGGER trg_sync_stock_sold
    AFTER INSERT OR UPDATE OF status, price_id OR DELETE
    ON payments.orders
    FOR EACH ROW
    EXECUTE FUNCTION payments.sync_stock_sold_from_orders();

CREATE OR REPLACE FUNCTION payments.enforce_price_upgrade_same_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = payments
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM payments.prices fp
        INNER JOIN payments.prices tp
            ON fp.product_id = tp.product_id
            AND fp.product_id IS NOT NULL
        WHERE fp.id = NEW.from_price_id
            AND tp.id = NEW.to_price_id
    ) THEN
        RAISE EXCEPTION 'price_upgrade_paths: from_price e to_price devem existir e compartilhar o mesmo product_id';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS price_upgrade_paths_enforce_same_product ON payments.price_upgrade_paths;
CREATE TRIGGER price_upgrade_paths_enforce_same_product
    BEFORE INSERT OR UPDATE ON payments.price_upgrade_paths
    FOR EACH ROW
    EXECUTE FUNCTION payments.enforce_price_upgrade_same_product();

ALTER TABLE payments.price_upgrade_paths
    DROP CONSTRAINT IF EXISTS price_upgrade_paths_from_to_distinct;
ALTER TABLE payments.price_upgrade_paths
    ADD CONSTRAINT price_upgrade_paths_from_to_distinct
    CHECK (from_price_id <> to_price_id);

CREATE OR REPLACE FUNCTION payments.catalog_price_pair_visible_public(p_price_a uuid, p_price_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payments
AS $$
    SELECT
        EXISTS (
            SELECT 1
            FROM payments.prices ap
            INNER JOIN payments.products p ON p.id = ap.product_id
            WHERE ap.id = p_price_a
                AND ap.active = TRUE
                AND p.active = TRUE
        )
        AND EXISTS (
            SELECT 1
            FROM payments.prices ad
            INNER JOIN payments.products p2 ON p2.id = ad.product_id
            WHERE ad.id = p_price_b
                AND ad.active = TRUE
                AND p2.active = TRUE
        );
$$;

CREATE OR REPLACE FUNCTION payments.validate_refund_policy(policy jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = payments
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
$$;

CREATE OR REPLACE FUNCTION payments.get_product_refund_policy(product_ref text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = payments
AS $$
    SELECT refund_policy
    FROM payments.products
    WHERE ref = product_ref
    LIMIT 1;
$$;

ALTER TABLE payments.products
    DROP CONSTRAINT IF EXISTS valid_refund_policy_structure;
ALTER TABLE payments.products
    ADD CONSTRAINT valid_refund_policy_structure
    CHECK (refund_policy IS NULL OR payments.validate_refund_policy(refund_policy));

CREATE OR REPLACE FUNCTION payments.apply_refund_to_order(p_order_id uuid, p_refunded_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE payments.orders
    SET
        status = 'refunded',
        refunded_at = p_refunded_at,
        updated_at = now()
    WHERE id = p_order_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'apply_refund_to_order: nenhuma linha atualizada (pedido % inexistente?)', p_order_id
            USING ERRCODE = 'P0001';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION payments.prevent_payment_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = payments
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM 'cancelled' THEN
        RAISE EXCEPTION 'PROIBIDO: Só é permitido deletar pagamento com status cancelled. Cancele o link primeiro (status atual: %).', OLD.status;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_asaas_payment_delete ON payments.asaas_payments;
CREATE TRIGGER prevent_asaas_payment_delete
    BEFORE DELETE ON payments.asaas_payments
    FOR EACH ROW
    EXECUTE FUNCTION payments.prevent_payment_delete();

DROP TRIGGER IF EXISTS prevent_pagarme_payment_delete ON payments.pagarme_payments;
CREATE TRIGGER prevent_pagarme_payment_delete
    BEFORE DELETE ON payments.pagarme_payments
    FOR EACH ROW
    EXECUTE FUNCTION payments.prevent_payment_delete();

DROP TRIGGER IF EXISTS set_updated_at ON payments.platform_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.platform_settings
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.products
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.profiles
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.admin_users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.admin_users
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.prices;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.prices
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.subscriptions
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.discount_coupons;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.discount_coupons
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.orders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.orders
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.pagarme_payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.pagarme_payments
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.price_promo_tiers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.price_promo_tiers
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.asaas_payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.asaas_payments
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments.email_logs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments.email_logs
    FOR EACH ROW EXECUTE FUNCTION payments.update_updated_at_column();
