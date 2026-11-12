-- ==========================================
-- Permitir DELETE de pagamentos ainda não realizados
-- ==========================================
-- Compliance: bloquear DELETE apenas quando status = paid/approved.
-- Pendentes, expirados, falhos etc. podem ser deletados (ex.: para gerar novo link).

CREATE OR REPLACE FUNCTION payments.prevent_payment_delete()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    IF (OLD.status IN ('paid', 'approved')) THEN
        RAISE EXCEPTION 'PROIBIDO: Não é permitido deletar pagamento já realizado (status: %).', OLD.status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION payments.prevent_payment_delete() IS
    'Permite DELETE apenas de pagamentos não realizados (pending, expired, etc.). Bloqueia paid/approved (compliance).';
