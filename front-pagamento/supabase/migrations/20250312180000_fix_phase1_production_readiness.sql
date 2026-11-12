-- ==========================================
-- Migration: Ajustes críticos para produção (Fase 1)
-- ==========================================
-- 1. asaas_payments.subscription_id: ON DELETE SET NULL com coluna NOT NULL é contraditório.
--    Trocar para ON DELETE RESTRICT.
-- 2. get_pending_pagarme_payment: validar p_user_id = auth.uid() (SECURITY DEFINER).
-- 3. cleanup_expired_payments: trocar DELETE por UPDATE status = 'expired' (trigger bloqueia DELETE).
-- ==========================================

-- --------------------------------------------------
-- 1. asaas_payments.subscription_id — ON DELETE RESTRICT
-- --------------------------------------------------
ALTER TABLE payments.asaas_payments
  DROP CONSTRAINT IF EXISTS asaas_payments_subscription_id_fkey;

ALTER TABLE payments.asaas_payments
  ADD CONSTRAINT asaas_payments_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES payments.subscriptions(id)
  ON DELETE RESTRICT;

-- --------------------------------------------------
-- 2. get_pending_pagarme_payment — validar auth.uid()
-- --------------------------------------------------
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
    IF p_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'Forbidden: cannot access another user payment';
    END IF;

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

COMMENT ON FUNCTION payments.get_pending_pagarme_payment IS 'Busca pagamento pendente mais recente para um usuário e produto. Só retorna dados do usuário atual (auth.uid()).';

-- --------------------------------------------------
-- 3. cleanup_expired_payments — UPDATE em vez de DELETE
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION payments.cleanup_expired_payments()
RETURNS integer
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_updated_count integer;
BEGIN
    UPDATE payments.pagarme_payments
    SET status = 'expired',
        updated_at = now()
    WHERE status IN ('pending', 'incomplete')
        AND expires_at < now()
        AND created_at < now() - interval '30 days';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION payments.cleanup_expired_payments IS 'Marca como expired pagamentos pendentes/incomplete expirados há mais de 30 dias (soft delete; trigger impede DELETE físico).';
