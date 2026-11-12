-- ==========================================
-- MIGRATION: Email Logs Table
-- ==========================================
-- Tabela para registrar todos os emails enviados pelo sistema
-- Útil para debug, auditoria e reenvio de emails

-- Email Logs Table
CREATE TABLE IF NOT EXISTS payments.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    -- Status do envio
    status text NOT NULL CHECK (status IN ('sending', 'success', 'failed')),
    
    -- Dados do email
    recipient text NOT NULL,
    subject text NOT NULL,
    from_name text,
    from_email text,
    reply_to text,
    cc text[],
    
    -- Corpo do email
    body_html text,
    body_text text,
    
    -- Resultado do envio
    error_message text,
    message_id text, -- ID do Nodemailer após envio bem-sucedido
    
    -- Metadados adicionais
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Relacionamento com pedido (opcional)
    order_id uuid REFERENCES payments.orders(id) ON DELETE SET NULL,
    
    -- ID do webhook que gerou este email (para idempotência)
    webhook_event_id uuid REFERENCES payments.webhook_events(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON payments.email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx ON payments.email_logs(recipient);
CREATE INDEX IF NOT EXISTS email_logs_order_id_idx ON payments.email_logs(order_id);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON payments.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_metadata_idx ON payments.email_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS email_logs_webhook_event_id_idx ON payments.email_logs(webhook_event_id);

-- Unique constraint para emails automáticos (de webhooks)
-- Bloqueia duplicatas APENAS quando vem de webhook (webhook_event_id NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_webhook_unique_idx 
ON payments.email_logs(order_id, (metadata->>'type'), webhook_event_id) 
WHERE webhook_event_id IS NOT NULL;

-- Índice para reenvios manuais (sem UNIQUE para permitir múltiplos reenvios)
CREATE INDEX IF NOT EXISTS email_logs_manual_idx 
ON payments.email_logs(order_id, (metadata->>'type')) 
WHERE webhook_event_id IS NULL;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_logs_updated_at 
    BEFORE UPDATE ON payments.email_logs
    FOR EACH ROW 
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Enable RLS
ALTER TABLE payments.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role tem acesso total
CREATE POLICY "Apenas service_role pode acessar email_logs" ON payments.email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Admins podem visualizar email_logs
CREATE POLICY "Admins podem ver email_logs" ON payments.email_logs
    FOR SELECT TO authenticated
    USING (payments.is_admin_user());

-- Grant permissions
GRANT USAGE ON SCHEMA payments TO service_role;
GRANT ALL ON payments.email_logs TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA payments TO service_role;

-- Permitir que authenticated possa ler email_logs (a RLS policy faz o controle de acesso)
GRANT SELECT ON payments.email_logs TO authenticated;

-- Comments
COMMENT ON TABLE payments.email_logs IS 'Log de todos os emails enviados pelo sistema';
COMMENT ON COLUMN payments.email_logs.status IS 'Status do envio: sending, success, failed';
COMMENT ON COLUMN payments.email_logs.recipient IS 'Email do destinatário';
COMMENT ON COLUMN payments.email_logs.message_id IS 'ID retornado pelo Nodemailer após envio bem-sucedido';
COMMENT ON COLUMN payments.email_logs.metadata IS 'Dados adicionais (ex: tipo de email, dados do pedido, etc)';
COMMENT ON COLUMN payments.email_logs.order_id IS 'Referência ao pedido relacionado (se aplicável)';
COMMENT ON COLUMN payments.email_logs.webhook_event_id IS 'ID do webhook que gerou este email (para idempotência - evita duplicatas)';

