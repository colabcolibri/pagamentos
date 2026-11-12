-- Faixas de desconto por preço (data e/ou quantidade) + estoque opcional no preço.
-- Contadores (units_sold, stock_sold) incrementados no pagamento confirmado (webhook), sem lock estrito (aceita corrida leve).

CREATE TABLE IF NOT EXISTS payments.price_promo_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    price_id uuid NOT NULL REFERENCES payments.prices (id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    discount_percent integer NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    ends_at timestamp with time zone,
    max_units integer CHECK (max_units IS NULL OR max_units > 0),
    units_sold integer NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS price_promo_tiers_price_id_idx ON payments.price_promo_tiers (price_id);
CREATE INDEX IF NOT EXISTS price_promo_tiers_price_sort_idx ON payments.price_promo_tiers (price_id, sort_order);

ALTER TABLE payments.prices
    ADD COLUMN IF NOT EXISTS stock_cap integer CHECK (stock_cap IS NULL OR stock_cap > 0),
    ADD COLUMN IF NOT EXISTS stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0);

COMMENT ON TABLE payments.price_promo_tiers IS 'Promoções por preço: % de desconto até ends_at e/ou enquanto units_sold < max_units (o que ocorrer primeiro na leitura).';
COMMENT ON COLUMN payments.price_promo_tiers.sort_order IS 'Menor valor = avaliado primeiro; primeira faixa elegível aplica o desconto.';
COMMENT ON COLUMN payments.price_promo_tiers.max_units IS 'Máximo de vendas que contam com este desconto; null = ilimitado para a faixa.';
COMMENT ON COLUMN payments.prices.stock_cap IS 'Vagas totais para este preço; null = ilimitado.';
COMMENT ON COLUMN payments.prices.stock_sold IS 'Vendas confirmadas (pagas) contadas para stock_cap.';

ALTER TABLE payments.price_promo_tiers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON payments.price_promo_tiers TO anon, authenticated;
GRANT ALL ON payments.price_promo_tiers TO service_role;

CREATE POLICY "Price promo tiers visíveis com price ativo"
    ON payments.price_promo_tiers
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM payments.prices p
            WHERE p.id = price_promo_tiers.price_id AND p.active = true
        )
    );

CREATE POLICY "Admins podem gerenciar price_promo_tiers"
    ON payments.price_promo_tiers
    FOR ALL
    USING (payments.is_admin_user())
    WITH CHECK (payments.is_admin_user());

CREATE TRIGGER update_price_promo_tiers_updated_at
    BEFORE UPDATE ON payments.price_promo_tiers
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_updated_at_column();
