-- ==========================================
-- DELETE só permitido quando status = cancelled
-- ==========================================
-- Fluxo: primeiro cancelar o link (API), depois excluir.
-- Compliance: paid/approved continuam bloqueados; demais só após cancelamento.

CREATE OR REPLACE FUNCTION payments.prevent_payment_delete()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM 'cancelled') THEN
        RAISE EXCEPTION 'PROIBIDO: Só é permitido deletar pagamento com status cancelled. Cancele o link primeiro (status atual: %).', OLD.status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION payments.prevent_payment_delete() IS
    'Permite DELETE apenas quando status = cancelled (link já cancelado no gateway). Bloqueia todos os demais (compliance).';
