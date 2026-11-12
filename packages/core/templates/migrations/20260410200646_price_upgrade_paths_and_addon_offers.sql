-- Caminhos de upgrade (mesmo produto) e ofertas de add-on / upsell (qualquer preço).

CREATE TABLE payments.price_upgrade_paths (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    from_price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    to_price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone ('utc'::text, now ()),
    CONSTRAINT price_upgrade_paths_from_to_distinct CHECK (from_price_id <> to_price_id),
    CONSTRAINT price_upgrade_paths_from_to_unique UNIQUE (from_price_id, to_price_id)
);

CREATE INDEX price_upgrade_paths_from_price_id_idx ON payments.price_upgrade_paths (from_price_id);

CREATE INDEX price_upgrade_paths_to_price_id_idx ON payments.price_upgrade_paths (to_price_id);

COMMENT ON TABLE payments.price_upgrade_paths IS 'Upgrade de plano no mesmo produto: preço de origem → preço de destino. Integridade de mesmo product_id via trigger.';

COMMENT ON COLUMN payments.price_upgrade_paths.metadata IS 'Rótulos e regras de UI (ex.: badge, copy); opcional.';

CREATE OR REPLACE FUNCTION payments.enforce_price_upgrade_same_product ()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT
            1
        FROM
            payments.prices fp
            INNER JOIN payments.prices tp ON fp.product_id = tp.product_id
                AND fp.product_id IS NOT NULL
        WHERE
            fp.id = NEW.from_price_id
            AND tp.id = NEW.to_price_id) THEN
        RAISE EXCEPTION 'price_upgrade_paths: from_price e to_price devem existir e compartilhar o mesmo product_id';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER price_upgrade_paths_enforce_same_product
    BEFORE INSERT OR UPDATE ON payments.price_upgrade_paths
    FOR EACH ROW
    EXECUTE FUNCTION payments.enforce_price_upgrade_same_product ();

CREATE TABLE payments.price_addon_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    anchor_price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    addon_price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone ('utc'::text, now ()),
    CONSTRAINT price_addon_offers_anchor_addon_distinct CHECK (anchor_price_id <> addon_price_id),
    CONSTRAINT price_addon_offers_anchor_addon_unique UNIQUE (anchor_price_id, addon_price_id)
);

CREATE INDEX price_addon_offers_anchor_price_id_idx ON payments.price_addon_offers (anchor_price_id);

CREATE INDEX price_addon_offers_addon_price_id_idx ON payments.price_addon_offers (addon_price_id);

COMMENT ON TABLE payments.price_addon_offers IS 'Upsell / add-on: ao escolher anchor_price_id, pode-se oferecer addon_price_id (mesmo ou outro produto).';

COMMENT ON COLUMN payments.price_addon_offers.metadata IS 'Rótulos e regras de UI; opcional.';

ALTER TABLE payments.price_upgrade_paths ENABLE ROW LEVEL SECURITY;

ALTER TABLE payments.price_addon_offers ENABLE ROW LEVEL SECURITY;

-- Leitura pública: só quando preços e produtos referenciados estão ativos (alinhado ao catálogo).
CREATE POLICY price_upgrade_paths_consolidated ON payments.price_upgrade_paths
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ()
        OR (
            EXISTS (
                SELECT
                    1
                FROM
                    payments.prices fp
                    INNER JOIN payments.products p ON p.id = fp.product_id
                WHERE
                    fp.id = from_price_id
                    AND fp.active = TRUE
                    AND p.active = TRUE)
            AND EXISTS (
                SELECT
                    1
                FROM
                    payments.prices tp
                    INNER JOIN payments.products p2 ON p2.id = tp.product_id
                WHERE
                    tp.id = to_price_id
                    AND tp.active = TRUE
                    AND p2.active = TRUE)))
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ());

CREATE POLICY price_addon_offers_consolidated ON payments.price_addon_offers
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ()
        OR (
            EXISTS (
                SELECT
                    1
                FROM
                    payments.prices ap
                    INNER JOIN payments.products p ON p.id = ap.product_id
                WHERE
                    ap.id = anchor_price_id
                    AND ap.active = TRUE
                    AND p.active = TRUE)
            AND EXISTS (
                SELECT
                    1
                FROM
                    payments.prices ad
                    INNER JOIN payments.products p2 ON p2.id = ad.product_id
                WHERE
                    ad.id = addon_price_id
                    AND ad.active = TRUE
                    AND p2.active = TRUE)))
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ());

GRANT ALL ON payments.price_upgrade_paths TO service_role;

GRANT SELECT ON payments.price_upgrade_paths TO anon, authenticated;

GRANT ALL ON payments.price_addon_offers TO service_role;

GRANT SELECT ON payments.price_addon_offers TO anon, authenticated;
