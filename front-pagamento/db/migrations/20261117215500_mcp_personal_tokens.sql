ALTER TABLE payments.mcp_tokens
    ADD COLUMN IF NOT EXISTS label text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE payments.mcp_tokens
    ALTER COLUMN client_id DROP NOT NULL,
    ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE payments.mcp_tokens
    DROP CONSTRAINT IF EXISTS mcp_tokens_kind;

ALTER TABLE payments.mcp_tokens
    ADD CONSTRAINT mcp_tokens_kind CHECK (kind IN ('access', 'refresh', 'pat'));
