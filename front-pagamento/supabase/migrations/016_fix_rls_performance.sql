-- ==========================================
-- CORREÇÃO: Performance RLS Policies
-- ==========================================
-- Este arquivo corrige:
-- 1. Substitui auth.uid() por (select auth.uid()) em todas as políticas RLS
-- 2. Substitui auth.role() por (select auth.role()) em todas as políticas RLS
-- 3. Consolida múltiplas políticas permissivas em uma única política FOR ALL por tabela
-- ==========================================
-- ==========================================
-- 1. payments.products
-- ==========================================
DROP POLICY IF EXISTS "Products ativos são visíveis para todos" ON payments.products;

DROP POLICY IF EXISTS "Service role pode modificar products" ON payments.products;

DROP POLICY IF EXISTS "Admins podem gerenciar products" ON payments.products;

DROP POLICY IF EXISTS "products_select_consolidated" ON payments.products;

DROP POLICY IF EXISTS "products_write_consolidated" ON payments.products;

DROP POLICY IF EXISTS "products_consolidated" ON payments.products;

-- Política consolidada única para todas as operações
CREATE POLICY "products_consolidated" ON payments.products AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: produtos ativos OU admins OU service_role
    -- DELETE: apenas service_role OU admins
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (payments.is_admin_user ())
    OR (active = true)
)
WITH
    CHECK (
        -- INSERT/UPDATE: apenas service_role OU admins
        (
            (
                select
                    auth.role ()
            ) = 'service_role'
        )
        OR (payments.is_admin_user ())
    );

-- ==========================================
-- 2. payments.prices
-- ==========================================
DROP POLICY IF EXISTS "Prices ativos são visíveis para todos" ON payments.prices;

DROP POLICY IF EXISTS "Service role pode modificar prices" ON payments.prices;

DROP POLICY IF EXISTS "Admins podem gerenciar prices" ON payments.prices;

DROP POLICY IF EXISTS "prices_select_consolidated" ON payments.prices;

DROP POLICY IF EXISTS "prices_write_consolidated" ON payments.prices;

DROP POLICY IF EXISTS "prices_consolidated" ON payments.prices;

-- Política consolidada única para todas as operações
CREATE POLICY "prices_consolidated" ON payments.prices AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: preços ativos OU admins OU service_role
    -- DELETE: apenas service_role OU admins
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (payments.is_admin_user ())
    OR (active = true)
)
WITH
    CHECK (
        -- INSERT/UPDATE: apenas service_role OU admins
        (
            (
                select
                    auth.role ()
            ) = 'service_role'
        )
        OR (payments.is_admin_user ())
    );

-- ==========================================
-- 3. payments.subscriptions
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem ver suas próprias subscriptions" ON payments.subscriptions;

DROP POLICY IF EXISTS "Service role pode gerenciar subscriptions" ON payments.subscriptions;

DROP POLICY IF EXISTS "Admins podem gerenciar subscriptions" ON payments.subscriptions;

DROP POLICY IF EXISTS "subscriptions_select_consolidated" ON payments.subscriptions;

DROP POLICY IF EXISTS "subscriptions_write_consolidated" ON payments.subscriptions;

DROP POLICY IF EXISTS "subscriptions_consolidated" ON payments.subscriptions;

-- Política consolidada única para todas as operações
CREATE POLICY "subscriptions_consolidated" ON payments.subscriptions AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: próprio usuário OU service_role OU admins
    -- INSERT/UPDATE/DELETE: service_role OU admins
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

-- ==========================================
-- 4. payments.pagarme_payments
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios payments" ON payments.pagarme_payments;

DROP POLICY IF EXISTS "Service role pode gerenciar payments" ON payments.pagarme_payments;

DROP POLICY IF EXISTS "Admins podem gerenciar pagarme payments" ON payments.pagarme_payments;

DROP POLICY IF EXISTS "pagarme_payments_select_consolidated" ON payments.pagarme_payments;

DROP POLICY IF EXISTS "pagarme_payments_write_consolidated" ON payments.pagarme_payments;

DROP POLICY IF EXISTS "pagarme_payments_consolidated" ON payments.pagarme_payments;

-- Política consolidada única para todas as operações
CREATE POLICY "pagarme_payments_consolidated" ON payments.pagarme_payments AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: próprio usuário OU service_role OU admins
    -- INSERT/UPDATE/DELETE: service_role OU admins
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

-- ==========================================
-- 5. payments.asaas_payments
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios payments" ON payments.asaas_payments;

DROP POLICY IF EXISTS "Service role pode gerenciar payments" ON payments.asaas_payments;

DROP POLICY IF EXISTS "Admins podem gerenciar asaas payments" ON payments.asaas_payments;

DROP POLICY IF EXISTS "asaas_payments_select_consolidated" ON payments.asaas_payments;

DROP POLICY IF EXISTS "asaas_payments_write_consolidated" ON payments.asaas_payments;

DROP POLICY IF EXISTS "asaas_payments_consolidated" ON payments.asaas_payments;

-- Política consolidada única para todas as operações
CREATE POLICY "asaas_payments_consolidated" ON payments.asaas_payments AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: próprio usuário OU service_role OU admins
    -- INSERT/UPDATE/DELETE: service_role OU admins
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

-- ==========================================
-- 6. payments.profiles
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON payments.profiles;

DROP POLICY IF EXISTS "Admins podem ver todos os profiles" ON payments.profiles;

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON payments.profiles;

DROP POLICY IF EXISTS "Admins podem atualizar qualquer profile" ON payments.profiles;

DROP POLICY IF EXISTS "Admins podem criar profiles" ON payments.profiles;

DROP POLICY IF EXISTS "profiles_select_consolidated" ON payments.profiles;

DROP POLICY IF EXISTS "profiles_update_consolidated" ON payments.profiles;

DROP POLICY IF EXISTS "profiles_insert_consolidated" ON payments.profiles;

DROP POLICY IF EXISTS "profiles_consolidated" ON payments.profiles;

-- Política consolidada única para todas as operações
CREATE POLICY "profiles_consolidated" ON payments.profiles AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT/UPDATE: próprio usuário OU admins
    -- INSERT: apenas admins (via WITH CHECK)
    (payments.is_admin_user ())
    OR (
        (
            (
                select
                    auth.uid ()
            ) = id
        )
    )
)
WITH
    CHECK (
        -- INSERT: apenas admins
        -- UPDATE: próprio usuário OU admins
        (payments.is_admin_user ())
        OR (
            (
                (
                    select
                        auth.uid ()
                ) = id
            )
        )
    );

-- ==========================================
-- 7. payments.orders
-- ==========================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios orders" ON payments.orders;

DROP POLICY IF EXISTS "Service role pode gerenciar orders" ON payments.orders;

DROP POLICY IF EXISTS "orders_select_consolidated" ON payments.orders;

DROP POLICY IF EXISTS "orders_write_consolidated" ON payments.orders;

DROP POLICY IF EXISTS "orders_consolidated" ON payments.orders;

-- Política consolidada única para todas as operações
CREATE POLICY "orders_consolidated" ON payments.orders AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: próprio usuário OU service_role
    -- INSERT/UPDATE/DELETE: apenas service_role
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (
        (
            (
                select
                    auth.uid ()
            ) = user_id
        )
    )
);

-- ==========================================
-- 8. payments.webhook_events
-- ==========================================
DROP POLICY IF EXISTS "service_role_all_webhook_events" ON payments.webhook_events;

DROP POLICY IF EXISTS "webhook_events_consolidated" ON payments.webhook_events;

CREATE POLICY "webhook_events_consolidated" ON payments.webhook_events AS PERMISSIVE FOR ALL TO public USING (
    (
        select
            auth.role ()
    ) = 'service_role'
);

-- ==========================================
-- 9. payments.email_logs
-- ==========================================
DROP POLICY IF EXISTS "Apenas service_role pode acessar email_logs" ON payments.email_logs;

DROP POLICY IF EXISTS "Admins podem ver email_logs" ON payments.email_logs;

DROP POLICY IF EXISTS "email_logs_select_consolidated" ON payments.email_logs;

DROP POLICY IF EXISTS "email_logs_write_consolidated" ON payments.email_logs;

DROP POLICY IF EXISTS "email_logs_consolidated" ON payments.email_logs;

-- Política consolidada única para todas as operações
CREATE POLICY "email_logs_consolidated" ON payments.email_logs AS PERMISSIVE FOR ALL TO public USING (
    -- SELECT: service_role OU admins autenticados
    -- INSERT/UPDATE/DELETE: apenas service_role
    (
        (
            select
                auth.role ()
        ) = 'service_role'
    )
    OR (payments.is_admin_user ())
);