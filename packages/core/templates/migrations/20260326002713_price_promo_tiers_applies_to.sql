-- Escopo do desconto da faixa: à vista, parcelado ou ambos (como cupom).

ALTER TABLE payments.price_promo_tiers
    ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'both'
        CHECK (applies_to IN ('avista', 'parcelado', 'both'));

COMMENT ON COLUMN payments.price_promo_tiers.applies_to IS 'avista = PIX/cartão 1x; parcelado = cartão parcelado; both = os dois fluxos.';
