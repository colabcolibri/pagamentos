CREATE TABLE IF NOT EXISTS payments.admin_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES payments.profiles (id),
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_events_created_idx
    ON payments.admin_audit_events (created_at DESC);
