-- ==========================================
-- MIGRATION: Asaas payments - pix_code e invoice_url
-- ==========================================
-- pix_code: código copia-e-cola do PIX (payload da API Asaas)
-- invoice_url: URL da página de pagamento hospedada pelo Asaas (retornada em toda cobrança)

ALTER TABLE payments.asaas_payments
  ADD COLUMN IF NOT EXISTS pix_code text,
  ADD COLUMN IF NOT EXISTS invoice_url text;

COMMENT ON COLUMN payments.asaas_payments.pix_code IS 'Código PIX copia-e-cola (payload retornado por /payments/{id}/pixQrCode)';
COMMENT ON COLUMN payments.asaas_payments.invoice_url IS 'URL da página de pagamento hospedada pelo Asaas (invoiceUrl retornado na criação da cobrança)';
