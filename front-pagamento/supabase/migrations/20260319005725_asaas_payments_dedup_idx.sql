-- ==========================================
-- Índice composto para deduplicação no checkout Asaas
-- ==========================================
-- Otimiza a query que busca cobrança pendente reutilizável
-- (user_id, price_id, product_id, status, billing_type, installments, created_at)

CREATE INDEX IF NOT EXISTS asaas_payments_dedup_idx
  ON payments.asaas_payments(user_id, price_id, product_id, billing_type, installments)
  WHERE status = 'pending';

COMMENT ON INDEX payments.asaas_payments_dedup_idx IS 'Otimiza busca de cobrança pendente para deduplicação no checkout';
