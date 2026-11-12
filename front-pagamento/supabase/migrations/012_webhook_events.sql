-- =====================================================
-- TABELA: webhook_events
-- =====================================================
-- Armazena todos os webhooks recebidos para auditoria
-- Inspirado no sistema do @app-client
-- =====================================================
CREATE TABLE
    IF NOT EXISTS payments.webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        provider TEXT NOT NULL, -- 'pagarme', 'asaas', etc
        event_type TEXT, -- 'order.paid', 'PAYMENT_RECEIVED', etc
        payload JSONB, -- Payload completo do webhook
        headers JSONB, -- Headers da requisição HTTP
        processing_status TEXT DEFAULT 'received', -- 'received', 'success', 'error'
        processing_log TEXT -- Mensagem de sucesso/erro do processamento
    );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON payments.webhook_events (provider);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON payments.webhook_events (event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON payments.webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON payments.webhook_events (processing_status);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status ON payments.webhook_events (provider, processing_status, created_at DESC);

-- RLS: Apenas service_role pode acessar webhooks
ALTER TABLE payments.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_webhook_events" ON payments.webhook_events FOR ALL USING (auth.role () = 'service_role');

-- Grants
GRANT
SELECT
,
    INSERT,
UPDATE ON payments.webhook_events TO service_role;

-- Comentários
COMMENT ON TABLE payments.webhook_events IS 'Registro de todos os webhooks recebidos para auditoria e debugging';

COMMENT ON COLUMN payments.webhook_events.provider IS 'Gateway de pagamento: pagarme, asaas, etc';

COMMENT ON COLUMN payments.webhook_events.event_type IS 'Tipo do evento reportado pelo provider';

COMMENT ON COLUMN payments.webhook_events.payload IS 'Payload JSON completo recebido';

COMMENT ON COLUMN payments.webhook_events.headers IS 'Headers HTTP da requisição do webhook';

COMMENT ON COLUMN payments.webhook_events.processing_status IS 'Status do processamento: received, success, error';

COMMENT ON COLUMN payments.webhook_events.processing_log IS 'Mensagem de sucesso ou erro do processamento';