-- Complemento de conteúdo dos emails por preço (somado ao email_config do produto).
ALTER TABLE payments.prices
  ADD COLUMN IF NOT EXISTS email_addon jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN payments.prices.email_addon IS 'Extras por preço para emails: { "order_created": { "custom_message", "instructions" }, "payment_confirmed": { "custom_message", "next_steps" } }. Concatenado ao texto configurado no produto.';
