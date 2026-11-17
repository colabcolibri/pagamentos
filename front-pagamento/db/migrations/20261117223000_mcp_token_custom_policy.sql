ALTER TABLE payments.mcp_tokens
    ADD COLUMN IF NOT EXISTS custom_policy jsonb;
