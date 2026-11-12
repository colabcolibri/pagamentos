---
title: User Types
status: draft
version: 1.0
updated: 2026-11-09
depends_on: [02_security.md]
blocks: [04_principles.md, 05_architecture.md, 06_database.md, 07_api_contracts.md]
---

# 03 — User types

Perfis nomeados em `00_scope`: cliente, admin e gateway.

## Profile index

| Profile | Primary surface | Auth required | Maps to role in `02_security` |
| ------- | --------------- | ------------- | ----------------------------- |
| Cliente | checkout e perfil | parcial. Catálogo aberto. Perfil exige sessão | Cliente autenticado |
| Admin | `/admin` | sim, e linha ativa em `admin_users` | Admin ativo |
| Gateway | webhook | segredo, não sessão | fora de RBAC de pessoa |

---

## Cliente

**Description:** pessoa que compra um preço. Usa o checkout na hora da compra e o perfil quando quer ver pedido ou dado de cobrança. Não opera o catálogo.

**Origin:** URL pública do checkout (`/checkout/[priceId]`) ou login (`/login`).

**Goals:**

- Pagar com o método oferecido naquele preço.
- Saber se o PIX, o boleto ou o cartão foi confirmado.
- Ver só os próprios pedidos.

**Permissions — can:**

- Abrir checkout, ver preço público, estimar cupom e add-on.
- Entrar com código enviado ao próprio e-mail.
- Ler e atualizar o próprio perfil.
- Ler os próprios pedidos.

**Restrictions — cannot:**

- Abrir o painel admin.
- Ler perfil ou pedido de outra pessoa.
- Marcar pagamento como pago ou alterar estoque.

**Session:** cookie de sessão do Supabase hoje (`02_security` § Authentication). Alvo: cookie `httpOnly` da aplicação.

**Visible data:** produto e preço públicos. Do próprio cadastro: nome, contato, documento e endereço. Dos próprios pedidos: status e dados de cobrança já exibidos na confirmação.

**Edge cases:**

| Situation | Expected behavior |
| --------- | ----------------- |
| No permission | rota de admin responde 401 ou 403. Tela `/unauthorized` existe |
| Empty state | perfil sem pedido mostra lista vazia, não erro de outro usuário |
| Session expired | pede código de novo. Checkout não reaproveita sessão vencida como se fosse admin |

**Evidence (Mode B):** `front-pagamento/src/app/checkout/[priceId]/page.tsx`, `front-pagamento/src/app/profile/page.tsx`, `front-pagamento/src/app/login/page.tsx`, `front-pagamento/src/app/api/profile/route.ts`.

---

## Admin

**Description:** pessoa da operação. Entra no mesmo login e só vê o painel se `payments.admin_users` tiver o id dela com `is_active`. Frequência: cadastro de preço e tratamento de pedido.

**Origin:** `/admin` depois do login.

**Goals:**

- Publicar produto e preço.
- Acompanhar pedido, pagamento e assinatura.
- Tratar exceção: cancelar, marcar pago, reenviar e-mail, recalcular estoque.

**Permissions — can:**

- Usar as rotas `/api/admin/*` quando o guard aceita.
- Editar catálogo, cupom, política de reembolso, webhook de produto e configuração da plataforma.
- Ler log de e-mail e eventos de webhook.

**Restrictions — cannot:**

- Operar se `is_active` for falso.
- Apagar pagamento em estado que `prevent_payment_delete` recusa.
- Ver a service role ou a connection string. Isso não é dado de tela.

**Session:** a mesma sessão do cliente, mais a checagem de admin no `proxy.ts` e em `api-guards.ts`.

**Visible data:** catálogo completo, pedidos, pagamentos, perfis ligados a pedidos, estatística de venda.

**Edge cases:**

| Situation | Expected behavior |
| --------- | ----------------- |
| No permission | layout admin não abre. API 403 |
| Empty state | lista de pedidos vazia no dashboard, sem dado de outro ambiente |
| Session expired | volta ao login |

**Evidence (Mode B):** `front-pagamento/src/app/admin/layout.tsx`, `front-pagamento/src/lib/auth/api-guards.ts`, `front-pagamento/supabase/migrations/008_admin_users.sql`. Há função `is_super_admin` no SQL. A diferença de super admin na UI não foi confirmada tela a tela nesta init.

---

## Anonymous / public access

| Capability | Allowed | Notes |
| ---------- | ------- | ----- |
| Página inicial | sim | `front-pagamento/src/app/page.tsx` |
| Checkout e catálogo público | sim | preço inativo não deve aparecer. Regra em SQL e nas rotas de produto |
| Preview de cupom | sim | `POST /api/payments/coupon/preview` |
| Contato e CEP | sim | `POST /api/contact`, rota `/api/cep` |
| Perfil, admin, marcar pago | não | exigem sessão e, no admin, papel |

## Service accounts / integrations

| Actor | Auth method | Scopes | Owner |
| ----- | ----------- | ------ | ----- |
| Pagar.me | segredo de webhook e chave de API no servidor | criar cobrança e notificar status | operação |
| Asaas | `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` | checkout à vista, parcelado e webhook | operação |
| SMTP | usuário e senha SMTP | enviar código e e-mail de pedido | operação |
| Supabase service role (hoje) | chave de servidor | escrever sem RLS | sai no incremento de Postgres |
| Job de limpeza | não há processo separado no repo | `cleanup_expired_payments` existe em SQL. Quem chama não foi confirmado | lacuna |

## Gaps / open questions

| # | Question | Blocks |
| - | -------- | ------ |
| 1 | Super admin é um perfil de tela ou só função SQL? | `05_architecture` |
| 2 | Desenvolvedor externo é usuário do produto? | `00_scope` |
| 3 | Visitante anônimo pode consultar status de pagamento só com o id? | `07_api_contracts` e história futura de polling |

## Gate

Permissões daqui precisam bater com `02_security` § Authorization antes de `approved`.
