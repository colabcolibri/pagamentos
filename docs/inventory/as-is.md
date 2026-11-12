---
title: As-is inventory
status: draft
created: 2026-11-09
updated: 2026-11-10
purpose: transitional
promoted_to: []
---

# As-is inventory

> Leitura de 2026-11-09, antes da sessão própria e do Postgres sem Supabase. O estado atual de auth, banco e rate limit está em `02_security.md`, `05_architecture.md` e `06_database.md`.

> Mapa do que já existe no código antes do backlog Meridian.
> Linhas com confiança **high** alimentam `00_scope`, `05_architecture` e candidatos a épico.
> Não criar user stories retroativas com `✅` a partir deste arquivo.

## How to read this file

| Column | Meaning |
| ------ | ------- |
| Capability | Comportamento visível ao usuário, em linguagem simples |
| Evidence | Caminhos, rotas, modelos ou docs que provam que existe |
| Confidence | `high` · `medium` · `low` |
| Epic candidate | Id sugerido ou `—`. Não cria o épico |
| Gaps | Dívida, teste faltando ou pergunta para o manager |

## Capabilities

| Capability | Evidence | Confidence | Epic candidate | Gaps |
| ---------- | -------- | ---------- | -------------- | ---- |
| Cliente abre checkout de um preço e vê produto, add-on e cupom | `front-pagamento/src/app/checkout/[priceId]/page.tsx`, `GET /api/products/by-price/[priceId]`, `POST /api/payments/coupon/preview` | high | EPIC-01 | Página ainda importa cliente Supabase no browser |
| Cliente paga à vista ou parcelado no Asaas | `POST /api/payments/asaas/checkout/avista`, `POST /api/payments/asaas/checkout/parcelado`, `packages/core/src/routes/asaas-checkout-*.ts` | high | EPIC-01 | Gravação via cliente Supabase admin |
| Cliente paga no Pagar.me (cartão, PIX, boleto) | `POST /api/payments/pagarme/checkout`, `packages/core/src/routes/pagarme-checkout.ts` | high | EPIC-01 | Mesma dependência de Supabase |
| Cliente acompanha PIX, boleto e confirmação | `front-pagamento/src/hooks/use-payment-polling.ts`, `GET /api/payments/[id]/status`, `GET /api/payments/[id]/confirmation`, `supabase/migrations/017_enable_realtime_payments.sql` | high | EPIC-01 | Polling mistura API e canal Realtime do Supabase |
| Gateway confirma ou estorna pagamento | `POST /api/payments/asaas/webhook`, `POST /api/payments/pagarme/webhook`, `packages/core/src/routes/asaas-webhook.ts` | high | EPIC-01 | Segredos obrigatórios em produção (`front-pagamento/src/lib/config/env.ts`) |
| Cliente entra com código por e-mail e sai da conta | `front-pagamento/src/components/auth/login-form.tsx`, `email-auth-form.tsx`, `packages/core/src/helpers/auth.ts` (`signInWithOtp`, `auth.admin.createUser`) | high | EPIC-02 | Identidade mora em `auth.users` do GoTrue, não no Postgres da aplicação |
| Cliente vê e edita o próprio perfil e os próprios pedidos | `front-pagamento/src/app/profile/page.tsx`, `GET/PATCH /api/profile`, `GET /api/profile/orders`, tabela `payments.profiles` | high | EPIC-02 | `profiles.id` referencia `auth.users` |
| Admin entra no painel só se estiver em `admin_users` | `front-pagamento/src/app/admin/layout.tsx`, `front-pagamento/proxy.ts`, `front-pagamento/src/lib/auth/api-guards.ts`, `supabase/migrations/008_admin_users.sql` | high | EPIC-03 | Checagem via RPC `is_admin_user` / `auth.uid()` |
| Admin mantém produtos, preços, cupons, reembolso e ajustes da plataforma | `front-pagamento/src/app/admin/products/page.tsx`, `admin/coupons/page.tsx`, `admin/settings/page.tsx`, rotas ` /api/admin/products`, `/api/admin/coupons`, `/api/admin/platform-settings` | high | EPIC-03 | Estoque e upgrade de preço dependem de função SQL |
| Admin opera pedidos e pagamentos | `admin/orders/page.tsx`, `admin/payments/page.tsx`, `POST .../mark-paid`, `.../cancel`, `.../delete-permanent`, `GET /api/admin/dashboard/stats` | high | EPIC-03 | Delete de pagamento travado por `payments.prevent_payment_delete` |
| Admin consulta assinaturas, webhooks e log de e-mail | `admin/subscriptions/page.tsx`, `admin/webhooks/page.tsx`, `admin/emails/page.tsx` | high | EPIC-03 | Retenção de `webhook_events` e `email_logs` não está definida no código lido |
| Visitante chama a página inicial, contato e consulta de CEP | `front-pagamento/src/app/page.tsx`, `POST /api/contact`, `GET /api/cep` | medium | — | Não li o contrato do provedor de CEP nesta passagem |
| Saúde da aplicação | `GET /api/health` | high | — | Deploy doc cita o health como verificação pós-rollback |
| Schema `payments` com RLS e papéis do Supabase | `front-pagamento/supabase/migrations/`, `docs/guides/quitou/rpc-privileges-defense.md` | high | EPIC-04 | Não sobe em Postgres vazio. Papéis `anon`, `authenticated`, `service_role` |
| Deploy do front na Vercel e migração no Supabase | `docs/guides/quitou/08-deploy.md`, `.github/workflows/ci.yml` | high | EPIC-04 | Direção pedida pelo manager: Postgres no VPS Hostinger. Ainda não há compose no repo |
| Pacote de domínio dos gateways | `packages/core`, `pnpm-workspace.yaml` | high | EPIC-01 | README antigo ainda aponta `../pagamento/` como localização do core. O código está em `packages/core` |

## Assumptions (needs human review)

- O produto em produção é o checkout e o admin descritos acima. Não há evidência de outro app consumidor do `@quitou/core` neste repositório.
- O próximo incremento é sair do Supabase Cloud para um Postgres 16 no VPS, com o Next no mesmo host. O manager pediu isso na conversa. Onde o Next roda hoje, pelo guia de deploy, é a Vercel. Essa troca de host não está no código.
- O login continua código por e-mail. Senha permanente não foi pedida.
- O rascunho `docs/guides/quitou/migracao-postgres-vps.md` é insumo, não backlog.
- Desenvolvedor integrador, citado em `docs/guides/quitou/01-visao-geral.md`, não é um usuário com tela própria neste repo. Tratar como operador do código até o manager confirmar se `@quitou/core` é produto publicado.

## Promotion checklist

- [ ] Comportamento de produto → `docs/00_scope.md`
- [ ] Usuários → `docs/03_user_types.md`
- [ ] Estrutura → `docs/05_architecture.md`
- [ ] Dados → `docs/06_database.md`
- [ ] APIs → `docs/07_api_contracts.md`
- [ ] Bloco grande → épico no SQLite só depois de `05_architecture` aprovado
- [ ] Escolha técnica já feita → `prepend-decision`

## Baseline version (optional)

Épicos de legado e versão `v0` ficam para depois da aprovação de `05_architecture`. Não marcar legado com user story `✅`.

Candidatos, só como id:

| Id | Bloco | Estado inferido |
| -- | ----- | --------------- |
| EPIC-01 | Checkout, pagamento e webhook | já em produção no código |
| EPIC-02 | Login, perfil e pedidos do cliente | já em produção no código |
| EPIC-03 | Painel admin | já em produção no código |
| EPIC-04 | Postgres no VPS, sem Supabase | trabalho futuro |

## Open questions

- O Next de produção continua na Vercel ou muda para o mesmo VPS do Postgres?
- Qual é a URL pública de produção e quem aprova o corte?
- Há titulares na União Europeia, ou só titulares no Brasil?
- Quem é o controlador LGPD e o contato do encarregado?
- `@quitou/core` é publicado para terceiros ou só usado por este front?
