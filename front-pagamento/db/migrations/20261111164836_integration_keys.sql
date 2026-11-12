ALTER TABLE payments.platform_settings
  ADD COLUMN IF NOT EXISTS gemini_api_key text,
  ADD COLUMN IF NOT EXISTS deepinfra_api_key text,
  ADD COLUMN IF NOT EXISTS products_by_price_api_key text;
