-- ==========================================
-- Migration: Idempotência de webhooks por event id do provedor
-- ==========================================
-- Adiciona coluna provider_event_id para evitar reprocessamento do mesmo evento.
-- ==========================================

ALTER TABLE payments.webhook_events
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id
  ON payments.webhook_events (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

COMMENT ON COLUMN payments.webhook_events.provider_event_id IS 'Identificador único do evento no provedor (ex.: asaas:pay_xxx:PAYMENT_RECEIVED). Usado para idempotência.';
