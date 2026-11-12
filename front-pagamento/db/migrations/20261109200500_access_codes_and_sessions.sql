-- Código de acesso e sessão da aplicação. Sem GoTrue e sem senha permanente.

CREATE TABLE IF NOT EXISTS payments.access_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES payments.profiles (id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_codes_profile_created_idx
    ON payments.access_codes (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid NOT NULL REFERENCES payments.profiles (id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_profile_idx ON payments.sessions (profile_id);
