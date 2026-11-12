-- ==========================================
-- MIGRATION: products.webhook_url e webhook_secret
-- ==========================================
-- URL e secret para envio de webhook quando pagamento for confirmado.
-- Se webhook_url preenchido, o Quitou envia POST com payload assinado (HMAC-SHA256).

ALTER TABLE payments.products
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_secret text;

COMMENT ON COLUMN payments.products.webhook_url IS 'URL para webhook de pagamento confirmado. POST enviado com payload do order quando status=paid. Opcional.';
COMMENT ON COLUMN payments.products.webhook_secret IS 'Secret compartilhado para assinar payload (HMAC-SHA256). Header X-Webhook-Signature: sha256=<hex>. Obrigatório se webhook_url preenchido.';
