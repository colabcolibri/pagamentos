-- ==========================================
-- Configurações globais da plataforma (singleton id = 1)
-- ==========================================

CREATE TABLE IF NOT EXISTS payments.platform_settings (
    id smallint PRIMARY KEY DEFAULT 1,
    CONSTRAINT platform_settings_singleton CHECK (id = 1),
    sale_notification_recipients text,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE payments.platform_settings IS 'Configurações globais do painel (uma única linha, id = 1)';
COMMENT ON COLUMN payments.platform_settings.sale_notification_recipients IS 'Emails que recebem aviso interno de venda aprovada (separados por vírgula)';

INSERT INTO payments.platform_settings (id, sale_notification_recipients)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trigger_platform_settings_updated_at
    BEFORE UPDATE ON payments.platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_admin_updated_at();

ALTER TABLE payments.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_consolidated" ON payments.platform_settings AS PERMISSIVE FOR ALL TO public USING (
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (payments.is_admin_user ())
)
WITH
    CHECK (
        (
            (
                select
                    auth.role ()
            ) = 'service_role'
        )
        OR (payments.is_admin_user ())
    );

GRANT ALL ON payments.platform_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments.platform_settings TO authenticated;
