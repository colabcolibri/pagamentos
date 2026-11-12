-- Webhook Asaas PAYMENT_REFUNDED: atualizar pedido sem depender de RLS do cliente PostgREST.
-- SECURITY DEFINER evita UPDATE em orders com 0 linhas (silencioso) quando políticas bloqueiam.

CREATE OR REPLACE FUNCTION payments.apply_refund_to_order(p_order_id uuid, p_refunded_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = payments, public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE payments.orders
  SET
    status = 'refunded',
    refunded_at = p_refunded_at,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'apply_refund_to_order: nenhuma linha atualizada (pedido % inexistente?)', p_order_id
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION payments.apply_refund_to_order(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION payments.apply_refund_to_order(uuid, timestamptz) TO service_role;

COMMENT ON FUNCTION payments.apply_refund_to_order(uuid, timestamptz) IS
  'Marca pedido como refunded (webhooks / jobs). Usa SECURITY DEFINER para não falhar por RLS.';
