-- Altera prices_product_id_fkey: ao deletar um produto, remove preços órfãos automaticamente.
-- Se outras tabelas (orders, pagamentos, etc.) ainda referenciarem um price, o DELETE em products falha (FKs downstream).

ALTER TABLE payments.prices
  DROP CONSTRAINT IF EXISTS prices_product_id_fkey;

ALTER TABLE payments.prices
  ADD CONSTRAINT prices_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES payments.products(id)
  ON DELETE CASCADE;
