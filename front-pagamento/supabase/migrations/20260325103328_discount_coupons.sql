-- ==========================================
-- Cupons de desconto (somente backend / admin via RLS)
-- applies_to: avista | parcelado | both
-- ==========================================

CREATE TABLE payments.discount_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed_cents')),
    discount_percent numeric(7, 4) NULL,
    discount_amount_cents integer NULL,
    applies_to text NOT NULL CHECK (applies_to IN ('avista', 'parcelado', 'both')),
    product_id uuid NULL REFERENCES payments.products (id) ON DELETE SET NULL,
    price_id uuid NULL REFERENCES payments.prices (id) ON DELETE SET NULL,
    max_redemptions_total integer NULL CHECK (max_redemptions_total IS NULL OR max_redemptions_total > 0),
    max_redemptions_per_user integer NULL CHECK (max_redemptions_per_user IS NULL OR max_redemptions_per_user > 0),
    starts_at timestamptz NULL,
    ends_at timestamptz NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT discount_coupons_percent_range CHECK (
        discount_percent IS NULL
        OR (discount_percent >= 0 AND discount_percent <= 100)
    ),
    CONSTRAINT discount_coupons_fixed_positive CHECK (
        discount_amount_cents IS NULL
        OR discount_amount_cents > 0
    ),
    CONSTRAINT discount_coupons_type_payload CHECK (
        (
            discount_type = 'percent'
            AND discount_percent IS NOT NULL
            AND discount_amount_cents IS NULL
        )
        OR (
            discount_type = 'fixed_cents'
            AND discount_amount_cents IS NOT NULL
            AND discount_percent IS NULL
        )
    )
);

CREATE UNIQUE INDEX discount_coupons_code_upper_idx ON payments.discount_coupons (upper(trim(code)));

CREATE TRIGGER update_discount_coupons_updated_at
    BEFORE UPDATE ON payments.discount_coupons
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_updated_at_column();

COMMENT ON TABLE payments.discount_coupons IS 'Cupons promocionais. Código armazenado em MAIÚSCULAS. Leitura/escrita para clientes finais bloqueada por RLS; uso apenas service_role no checkout.';
COMMENT ON COLUMN payments.discount_coupons.applies_to IS 'avista: PIX/boleto/1x com base à vista; parcelado: total parcelado (sem desconto à vista do preço); both: ambos os fluxos';
COMMENT ON COLUMN payments.discount_coupons.code IS 'Código normalizado em maiúsculas (aplicação no checkout faz trim + upper)';

CREATE TABLE payments.coupon_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id uuid NOT NULL REFERENCES payments.discount_coupons (id) ON DELETE CASCADE,
    order_id uuid NOT NULL REFERENCES payments.orders (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT coupon_redemptions_order_unique UNIQUE (coupon_id, order_id)
);

CREATE INDEX coupon_redemptions_coupon_id_idx ON payments.coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_coupon_idx ON payments.coupon_redemptions (user_id, coupon_id);

COMMENT ON TABLE payments.coupon_redemptions IS 'Vínculo cupom + pedido após checkout criado. INSERT apenas via service_role.';

ALTER TABLE payments.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Cupons: clientes não leem; admin e service_role gerenciam / leem
CREATE POLICY discount_coupons_consolidated ON payments.discount_coupons
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ()
    )
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ()
    );

-- Resgates: leitura admin ou service_role; escrita só service_role (checkout)
CREATE POLICY coupon_redemptions_select_consolidated ON payments.coupon_redemptions
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ()
    );

CREATE POLICY coupon_redemptions_insert_consolidated ON payments.coupon_redemptions
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
    );

GRANT ALL ON payments.discount_coupons TO service_role;
GRANT ALL ON payments.coupon_redemptions TO service_role;
GRANT SELECT ON payments.discount_coupons TO authenticated;
GRANT SELECT ON payments.coupon_redemptions TO authenticated;
