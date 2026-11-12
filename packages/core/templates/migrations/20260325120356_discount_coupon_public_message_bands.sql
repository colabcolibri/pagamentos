-- Faixas opcionais (JSON) por quantidade de usos restantes: prefixos/sufixos públicos que sobrescrevem o padrão do cupom.

ALTER TABLE payments.discount_coupons
  ADD COLUMN public_message_bands jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN payments.discount_coupons.public_message_bands IS
  'Lista de { remaining_min, remaining_max?, remaining_prefix?, remaining_suffix?, remaining_hide_number?, remaining_message_only? }; remaining_hide_number true nesta faixa = só remaining_message_only (sem número). remaining_max omitido ou null = sem limite superior. Intervalo fechado [remaining_min, remaining_max]. Ordem: primeira faixa que contém os usos restantes vence.';
