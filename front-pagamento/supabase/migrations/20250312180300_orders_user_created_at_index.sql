-- Índice composto para listagem de orders por usuário ordenada por data (Fase 8.1)
-- Melhora performance de queries: WHERE user_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_desc_idx
  ON payments.orders (user_id, created_at DESC);

COMMENT ON INDEX payments.orders_user_id_created_at_desc_idx IS
  'Listagem de pedidos por usuário ordenada por data (performance)';
