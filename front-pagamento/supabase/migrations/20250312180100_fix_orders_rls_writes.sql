-- ==========================================
-- Migration: RLS em orders — apenas leitura para usuário
-- ==========================================
-- Usuário autenticado pode apenas SELECT nos próprios orders.
-- INSERT/UPDATE/DELETE apenas para service_role e admin.
-- ==========================================

DROP POLICY IF EXISTS "orders_consolidated" ON payments.orders;

-- SELECT: usuário vê os próprios; admin e service_role veem todos
CREATE POLICY "orders_select_own_or_admin" ON payments.orders
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (SELECT auth.role()) = 'service_role'
    OR payments.is_admin_user()
    OR (SELECT auth.uid()) = user_id
  );

-- INSERT: apenas service_role e admin
CREATE POLICY "orders_insert_service_admin" ON payments.orders
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR payments.is_admin_user()
  );

-- UPDATE: apenas service_role e admin
CREATE POLICY "orders_update_service_admin" ON payments.orders
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (SELECT auth.role()) = 'service_role'
    OR payments.is_admin_user()
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR payments.is_admin_user()
  );

-- DELETE: apenas service_role e admin
CREATE POLICY "orders_delete_service_admin" ON payments.orders
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (SELECT auth.role()) = 'service_role'
    OR payments.is_admin_user()
  );

COMMENT ON POLICY "orders_select_own_or_admin" ON payments.orders IS 'Usuário vê apenas próprios orders; admin e service_role veem todos';
COMMENT ON POLICY "orders_insert_service_admin" ON payments.orders IS 'Apenas service_role e admin podem criar orders';
COMMENT ON POLICY "orders_update_service_admin" ON payments.orders IS 'Apenas service_role e admin podem atualizar orders';
COMMENT ON POLICY "orders_delete_service_admin" ON payments.orders IS 'Apenas service_role e admin podem deletar orders';
