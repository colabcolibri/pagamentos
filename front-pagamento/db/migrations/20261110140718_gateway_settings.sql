ALTER TABLE payments.platform_settings
  ADD COLUMN IF NOT EXISTS asaas_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pagarme_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS asaas_api_key text,
  ADD COLUMN IF NOT EXISTS asaas_webhook_secret text,
  ADD COLUMN IF NOT EXISTS asaas_environment text,
  ADD COLUMN IF NOT EXISTS pagarme_secret_key text,
  ADD COLUMN IF NOT EXISTS pagarme_webhook_user text,
  ADD COLUMN IF NOT EXISTS pagarme_webhook_secret text,
  ADD COLUMN IF NOT EXISTS pagarme_environment text;

ALTER TABLE payments.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_asaas_environment_check;
ALTER TABLE payments.platform_settings
  ADD CONSTRAINT platform_settings_asaas_environment_check
  CHECK (asaas_environment IS NULL OR asaas_environment IN ('sandbox', 'production'));

ALTER TABLE payments.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_pagarme_environment_check;
ALTER TABLE payments.platform_settings
  ADD CONSTRAINT platform_settings_pagarme_environment_check
  CHECK (pagarme_environment IS NULL OR pagarme_environment IN ('sandbox', 'production'));
