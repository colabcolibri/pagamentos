-- Cupom pode restringir a vários preços (além de discount_coupons.price_id legado).

CREATE TABLE payments.discount_coupon_prices (
    coupon_id uuid NOT NULL REFERENCES payments.discount_coupons (id) ON DELETE CASCADE,
    price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (coupon_id, price_id)
);

CREATE INDEX discount_coupon_prices_price_id_idx ON payments.discount_coupon_prices (price_id);

COMMENT ON TABLE payments.discount_coupon_prices IS 'Preços permitidos para o cupom. Na aplicação, a restrição efetiva é a união destes registros com discount_coupons.price_id. Vazio = qualquer preço (sujeito ao escopo de produto).';

INSERT INTO payments.discount_coupon_prices (coupon_id, price_id)
SELECT id, price_id
FROM payments.discount_coupons
WHERE price_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE payments.discount_coupon_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_coupon_prices_consolidated ON payments.discount_coupon_prices
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

GRANT ALL ON payments.discount_coupon_prices TO service_role;
GRANT SELECT ON payments.discount_coupon_prices TO authenticated;
