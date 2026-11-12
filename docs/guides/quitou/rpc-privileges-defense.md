# Hardening de RPCs sensíveis no schema `payments`

Este guia explica **se podemos** aplicar as mitigações discutidas na auditoria (funções `SECURITY DEFINER`, grants amplos no `002_products_and_prices.sql` e chamadas diretas via PostgREST) e **o que foi escolhido** na migration associada.

## Contexto

No Supabase, o cliente com `anon` / `authenticated` fala com o PostgREST. Qualquer função no schema exposto com `EXECUTE` para esse papel pode ser invocada como RPC, **independente** do Next.js. Por isso a fonte da verdade para “quem pode fazer o quê” precisa incluir **corpo da função** e **privilégios `GRANT`/`REVOKE`**, não só a UI admin.

A migration `002_products_and_prices.sql` concedeu `GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA payments TO authenticated` e `ALTER DEFAULT PRIVILEGES ... ON FUNCTIONS TO authenticated`. Um `GRANT EXECUTE ... TO service_role` em migração posterior **não remove** o direito já herdado por `authenticated`.

## Podemos restringir por `REVOKE` + `GRANT`?

Sim, no PostgreSQL isso é suportado e é o padrão recomendado para funções que só o backend (`service_role`) deve chamar.

**Limitação importante:** o papel que **dispara o trigger** precisa de `EXECUTE` nas funções do trigger e nas funções chamadas por ela (comportamento do PostgreSQL: privilégios são verificados em relação ao usuário da sessão que causou o evento, não ao dono `SECURITY DEFINER` da função externa, para a cadeia de chamadas).

No projeto, `orders` pode ser atualizado por:

- `service_role` (webhooks, várias rotas API com `createAdminSupabaseClient()`), e
- **JWT de admin** (`authenticated` com `payments.is_admin_user()`), por exemplo em `mark-paid`, que chama `orderService.updateOrderStatus` com o cliente do usuário admin.

Nesse segundo caso, o trigger `trg_sync_stock_sold` roda na sessão **`authenticated`**. Por isso **não** é seguro revogar `EXECUTE` em `payments.recalc_stock_for_price(uuid)` para `authenticated` sem mudar o app para usar só `service_role` em todas as escritas em `orders`. A mitigação aplicada é **guarda no corpo** da função (ver abaixo), não revogação cega.

## O que a migration implementa

| Função | Estratégia | Motivo |
|--------|------------|--------|
| `payments.upsert_profile(...)` | Checagem: `auth.role() = 'service_role'` **ou** `auth.uid() = user_id` **ou** admin | Mantém checkout (`upsertUserProfile` com `supabaseAdmin`) e app do cliente; elimina IDOR entre dois JWTs `authenticated`. |
| `payments.get_sales_stats(...)` | Corpo só aceita `auth.role() = 'service_role'`; `REVOKE` de `PUBLIC`/`anon`/`authenticated`; `GRANT EXECUTE` só a `service_role` | Métricas globais; o dashboard admin atual não usa essa RPC (consulta tabelas com RLS). |
| `payments.cleanup_expired_payments()` | Igual: só `service_role` no corpo + `REVOKE`/`GRANT` alinhados | Manutenção em massa; não há uso no `src` com JWT de usuário. |
| `payments.recalc_stock_for_price(uuid)` | Corpo: permitir se `pg_trigger_depth() >= 1` **ou** `service_role` **ou** admin | Recalculo automático via trigger após mudança em pedidos; rota admin usa `service_role`; bloqueia RPC direto por usuário comum. |

## Riscos residuais e próximos passos

- **`ALTER DEFAULT PRIVILEGES` do `002`:** novas funções no schema `payments` continuam podendo nascer com `EXECUTE` para `authenticated` até alguém restringir explicitamente. Endurecer isso é uma migração de **política de schema** maior (revisar cada RPC pública).
- **`promote_user_to_admin` / `admin_has_permission`:** referenciados em `packages/core` mas **sem** definição SQL neste repositório; tratar como dívida de código ou alinhar com o banco real.
- **Verificação após deploy:** com `psql` ou painel, confirmar `has_function_privilege('authenticated', 'payments.get_sales_stats(timestamptz,timestamp with time zone)', 'execute')` = false e que o painel e o checkout seguem ok.

## Referência da migration

Arquivo aplicado no repositório: `front-pagamento/supabase/migrations/20260413220627_harden_definer_rpc_privileges.sql`.

Após aplicar no ambiente, rode `supabase db push` (ou o fluxo de migração que vocês usam) e valide checkout, perfil e painel admin (incluindo “marcar como pago” e “recalcular estoque”).

## Testes

| Tipo | Onde | Como rodar |
|------|------|------------|
| Vitest — rota admin `recalc-stock` | `front-pagamento/src/app/api/admin/products/[id]/prices/[priceId]/recalc-stock/route.test.ts` | `pnpm test` (no `front-pagamento`) |
| Vitest — `requireAuth` / `requireAdmin` | `front-pagamento/src/lib/auth/api-guards.test.ts` | `pnpm test` (no `front-pagamento`) |
| Vitest — `upsert_profile`, `getUserFromAuth`, `sendOtpAndCreateUserIfNeeded` | `packages/core/src/helpers/auth.test.ts` | `pnpm test` (no `packages/core`) |
| pgTAP — privilégios `EXECUTE` em `get_sales_stats` e `cleanup_expired_payments` | `front-pagamento/supabase/tests/database/rpc_hardening_grants.test.sql` | `pnpm test:db` no `front-pagamento` (Supabase CLI, DB local com migrações aplicadas) |

Os testes Vitest usam mocks e cobrem o contrato HTTP/SDK e os guards `requireAuth` / `requireAdmin`. Os testes SQL validam que `authenticated`/`anon` não têm `EXECUTE` nas duas funções restritas após a migration (falham se a migration não estiver aplicada).

Ainda fora de escopo automático (alto custo): simular JWT/`SET ROLE` no Postgres para provar que o **corpo** de `upsert_profile` e `recalc_stock_for_price` rejeita cenários específicos; isso exige helpers (ex.: extensões de teste) ou e2e contra projeto Supabase.
