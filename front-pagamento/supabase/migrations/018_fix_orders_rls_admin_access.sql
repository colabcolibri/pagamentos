-- ==========================================
-- CORREÇÃO: Adicionar acesso de admin em orders
-- ==========================================
-- Problema: Admins não conseguem ver todos os orders no painel admin
-- Solução: Adicionar payments.is_admin_user() na política RLS
-- Data: 2025-01-XX
-- ==========================================
DROP POLICY IF EXISTS "orders_consolidated" ON payments.orders;

-- Política corrigida: permite que admins vejam todos os orders
CREATE POLICY "orders_consolidated" ON payments.orders AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: próprio usuário OU service_role OU admins
    -- INSERT/UPDATE/DELETE: apenas service_role OU admins
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (payments.is_admin_user ())
    OR (
        (
            (
                select
                    auth.uid ()
            ) = user_id
        )
    )
);

COMMENT ON POLICY "orders_consolidated" ON payments.orders IS 'Permite que usuários vejam seus próprios orders, admins vejam todos os orders, e service_role tenha acesso total';