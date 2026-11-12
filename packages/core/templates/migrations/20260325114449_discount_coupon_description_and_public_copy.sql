-- Descrição interna + textos opcionais para exibir contagem restante e validade (montagem no front: antes + valor + depois).

ALTER TABLE payments.discount_coupons
  ADD COLUMN description text NULL,
  ADD COLUMN public_show_remaining boolean NOT NULL DEFAULT false,
  ADD COLUMN public_remaining_prefix text NULL,
  ADD COLUMN public_remaining_suffix text NULL,
  ADD COLUMN public_show_valid_until boolean NOT NULL DEFAULT false,
  ADD COLUMN public_valid_until_prefix text NULL,
  ADD COLUMN public_valid_until_suffix text NULL;

COMMENT ON COLUMN payments.discount_coupons.description IS 'Uso interno / admin; não exibido no checkout por padrão.';
COMMENT ON COLUMN payments.discount_coupons.public_show_remaining IS 'Quando true, o cliente pode ver quantos usos restam (prefix + número + suffix).';
COMMENT ON COLUMN payments.discount_coupons.public_show_valid_until IS 'Quando true, o cliente pode ver validade usando ends_at (prefix + data + suffix).';
