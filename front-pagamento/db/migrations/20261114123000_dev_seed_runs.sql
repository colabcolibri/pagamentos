CREATE TABLE IF NOT EXISTS payments.dev_seed_runs (
  id integer PRIMARY KEY CHECK (id = 1),
  executed_at timestamptz NOT NULL DEFAULT now(),
  executed_by uuid REFERENCES payments.profiles(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
