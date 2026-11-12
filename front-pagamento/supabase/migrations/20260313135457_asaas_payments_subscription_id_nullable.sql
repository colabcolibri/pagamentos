-- ==========================================
-- subscription_id nullable para pedidos one-time (Asaas)
-- ==========================================
-- Pagamentos avulsos não têm subscription; permitir NULL em asaas_payments.

ALTER TABLE payments.asaas_payments
  ALTER COLUMN subscription_id DROP NOT NULL;

COMMENT ON COLUMN payments.asaas_payments.subscription_id IS 'Referência à subscription (assinatura). NULL para pagamento único (one-time).';
