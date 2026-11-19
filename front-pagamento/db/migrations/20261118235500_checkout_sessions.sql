-- Checkout Sessions & Integration Keys (US-0049)

CREATE TABLE IF NOT EXISTS payments.checkout_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  allowed_product_ids uuid[],
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  api_key_id uuid REFERENCES payments.checkout_api_keys(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES payments.products(id) ON DELETE RESTRICT,
  price_id uuid REFERENCES payments.prices(id) ON DELETE SET NULL,
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('catalog', 'custom')),
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents > 0),
  customer_email text,
  customer_name text,
  email_verified_by_origin boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_url text,
  cancel_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paying', 'completed', 'expired', 'cancelled')),
  order_id uuid REFERENCES payments.orders(id) ON DELETE SET NULL,
  idempotency_key text,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_idempotency
  ON payments.checkout_sessions (api_key_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_order_id
  ON payments.checkout_sessions (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at
  ON payments.checkout_sessions (expires_at)
  WHERE status IN ('open', 'paying');

ALTER TABLE payments.products
  ADD COLUMN IF NOT EXISTS allow_custom_amount boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_amount_cents integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_amount_cents integer;

ALTER TABLE payments.products
  DROP CONSTRAINT IF EXISTS products_custom_amount_bounds;

ALTER TABLE payments.products
  ADD CONSTRAINT products_custom_amount_bounds
  CHECK (min_amount_cents >= 100 AND (max_amount_cents IS NULL OR max_amount_cents >= min_amount_cents));
