-- ==========================================
-- MIGRATION: Helper Functions
-- ==========================================
-- Funções auxiliares para o sistema de pagamentos no schema payments

-- Função para buscar pagamento pendente do Pagar.me
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
SET search_path = payments, public, auth
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

COMMENT ON FUNCTION payments.get_pending_pagarme_payment IS 'Busca pagamento pendente mais recente para um usuário e produto';

-- Função para obter estatísticas de vendas
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
SET search_path = payments
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

COMMENT ON FUNCTION payments.get_sales_stats IS 'Retorna estatísticas de vendas (total, receita, ticket médio, conversão)';

-- Função para limpar pagamentos expirados
CREATE OR REPLACE FUNCTION payments.cleanup_expired_payments()
RETURNS integer
SECURITY DEFINER
SET search_path = payments
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

COMMENT ON FUNCTION payments.cleanup_expired_payments IS 'Remove pagamentos expirados há mais de 30 dias';

-- Grant permissions nas funções
GRANT EXECUTE ON FUNCTION payments.get_pending_pagarme_payment TO authenticated;
GRANT EXECUTE ON FUNCTION payments.get_sales_stats TO service_role;
GRANT EXECUTE ON FUNCTION payments.cleanup_expired_payments TO service_role;

