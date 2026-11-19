-- Outbound webhook deliveries tracking & safe profile address columns (US-0057)

CREATE TABLE IF NOT EXISTS payments.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  checkout_session_id uuid REFERENCES payments.checkout_sessions(id) ON DELETE SET NULL,
  order_id uuid NOT NULL REFERENCES payments.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES payments.products(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  http_status integer,
  last_error text,
  payload jsonb NOT NULL,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_event_target
  ON payments.webhook_deliveries (event_id, target_url);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON payments.webhook_deliveries (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE payments.profiles
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;
