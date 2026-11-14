-- Limpeza segura de pedidos e cobranças pendentes já expirados.
CREATE OR REPLACE FUNCTION payments.cleanup_expired_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments
AS $$
DECLARE
    v_updated integer := 0;
    v_step integer := 0;
BEGIN
    UPDATE payments.pagarme_payments
    SET status = 'expired'
    WHERE status IN ('pending', 'pix_generated', 'boleto_generated')
      AND expires_at IS NOT NULL
      AND expires_at < now();
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_updated := v_updated + v_step;

    UPDATE payments.asaas_payments ap
    SET status = 'expired'
    FROM payments.orders o
    WHERE ap.order_id = o.id
      AND ap.status = 'pending'
      AND o.expires_at IS NOT NULL
      AND o.expires_at < now();
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_updated := v_updated + v_step;

    UPDATE payments.orders
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < now();
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_updated := v_updated + v_step;

    RETURN v_updated;
END;
$$;
