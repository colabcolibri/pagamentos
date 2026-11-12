-- Cupom pode restringir a vários produtos (além de discount_coupons.product_id legado).

CREATE TABLE payments.discount_coupon_products (
    coupon_id uuid NOT NULL REFERENCES payments.discount_coupons (id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES payments.products (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (coupon_id, product_id)
);

CREATE INDEX discount_coupon_products_product_id_idx ON payments.discount_coupon_products (product_id);

COMMENT ON TABLE payments.discount_coupon_products IS 'Produtos permitidos para o cupom. Na aplicação, a restrição efetiva é a união destes registros com discount_coupons.product_id.';

INSERT INTO payments.discount_coupon_products (coupon_id, product_id)
SELECT id, product_id
FROM payments.discount_coupons
WHERE product_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE payments.discount_coupon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_coupon_products_consolidated ON payments.discount_coupon_products
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

GRANT ALL ON payments.discount_coupon_products TO service_role;
GRANT SELECT ON payments.discount_coupon_products TO authenticated;
