-- ==========================================
-- Adiciona refunded_at em pagarme_payments para rastrear reembolsos (webhook charge.refunded)
-- ==========================================

ALTER TABLE payments.pagarme_payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;

COMMENT ON COLUMN payments.pagarme_payments.refunded_at IS 'Data/hora do reembolso quando status = refunded';
