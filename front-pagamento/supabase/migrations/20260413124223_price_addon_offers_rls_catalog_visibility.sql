-- Corrige visibilidade de price_addon_offers (e upgrade_paths) para anon no checkout.
-- A política anterior usava EXISTS em prices/products com o papel invocador; em alguns
-- contextos o catálogo público não enxergava as mesmas linhas que sessão autenticada/admin.
-- Esta função SECURITY DEFINER avalia só preço+produto ativos (equivalente ao EXISTS antigo).

CREATE OR REPLACE FUNCTION payments.catalog_price_pair_visible_public (p_price_a uuid, p_price_b uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = payments
    STABLE
    AS $$
    SELECT
        EXISTS (
            SELECT
                1
            FROM
                payments.prices ap
                INNER JOIN payments.products p ON p.id = ap.product_id
            WHERE
                ap.id = p_price_a
                AND ap.active = TRUE
                AND p.active = TRUE)
        AND EXISTS (
            SELECT
                1
            FROM
                payments.prices ad
                INNER JOIN payments.products p2 ON p2.id = ad.product_id
            WHERE
                ad.id = p_price_b
                AND ad.active = TRUE
                AND p2.active = TRUE);
$$;

REVOKE ALL ON FUNCTION payments.catalog_price_pair_visible_public (uuid, uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION payments.catalog_price_pair_visible_public (uuid, uuid) TO anon,
authenticated,
service_role;

COMMENT ON FUNCTION payments.catalog_price_pair_visible_public (uuid, uuid) IS 'Usado em RLS: dois preços ativos com produtos ativos (catálogo checkout público).';

DROP POLICY IF EXISTS price_upgrade_paths_consolidated ON payments.price_upgrade_paths;

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
        OR payments.catalog_price_pair_visible_public (from_price_id, to_price_id))
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ());

DROP POLICY IF EXISTS price_addon_offers_consolidated ON payments.price_addon_offers;

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
        OR payments.catalog_price_pair_visible_public (anchor_price_id, addon_price_id))
    WITH CHECK (
        (
            SELECT
                auth.role ()
        ) = 'service_role'
        OR payments.is_admin_user ());
