CREATE TABLE IF NOT EXISTS payments.mcp_settings (
    id integer PRIMARY KEY,
    enabled boolean NOT NULL DEFAULT false,
    CONSTRAINT mcp_settings_singleton CHECK (id = 1)
);

INSERT INTO payments.mcp_settings (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payments.mcp_policy (
    policy_key text NOT NULL,
    action text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    PRIMARY KEY (policy_key, action),
    CONSTRAINT mcp_policy_action CHECK (action IN ('read', 'upsert', 'delete'))
);

INSERT INTO payments.mcp_policy (policy_key, action, enabled)
VALUES ('identidade', 'read', true)
ON CONFLICT (policy_key, action) DO NOTHING;

CREATE TABLE IF NOT EXISTS payments.mcp_clients (
    id text PRIMARY KEY,
    redirect_uris jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments.mcp_auth_codes (
    code_hash text PRIMARY KEY,
    client_id text NOT NULL REFERENCES payments.mcp_clients (id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES payments.profiles (id),
    redirect_uri text NOT NULL,
    code_challenge text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);

CREATE TABLE IF NOT EXISTS payments.mcp_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash text NOT NULL UNIQUE,
    kind text NOT NULL,
    profile_id uuid NOT NULL REFERENCES payments.profiles (id),
    client_id text NOT NULL REFERENCES payments.mcp_clients (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    CONSTRAINT mcp_tokens_kind CHECK (kind IN ('access', 'refresh'))
);

CREATE INDEX IF NOT EXISTS mcp_tokens_profile_idx
    ON payments.mcp_tokens (profile_id, revoked_at);

ALTER TABLE payments.admin_audit_events
    ADD COLUMN IF NOT EXISTS detail text;
