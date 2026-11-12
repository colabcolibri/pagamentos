---
title: Scope
status: draft
version: 1.0
updated: 2026-11-09
depends_on: []
blocks: [01_tech_stack.md, 04_principles.md, 05_architecture.md]
---

# 00 — Scope

## Name and description

**Product name:** Quitou

O Quitou é o sistema de pagamento em que o cliente compra um preço (PIX, boleto ou cartão) e o admin acompanha pedido, produto e estorno. Roda no navegador. A operação do dia a dia é o admin no painel e o cliente no checkout. O pacote `@quitou/core` concentra a conversa com Pagar.me e Asaas. O app Next está em `front-pagamento`.

## Problem it solves

**Before:** Cobrar no Brasil exige escolher gateway, montar checkout, receber webhook e separar o que é pedido do que é pagamento. Sem o Quitou, isso fica espalhado em cada tela e em cada conta de gateway.

**After:** O cliente conclui a compra num checkout e recebe o status. O admin vê o pedido, o pagamento e o catálogo no mesmo painel. O webhook do gateway atualiza o que foi pago ou estornado.

**Why now:** O banco hoje é o Supabase Cloud. A operação quer um Postgres simples no VPS da Hostinger que já hospeda outros serviços, sem carregar a plataforma Supabase. O comportamento de checkout e admin permanece. Muda onde os dados e a sessão moram.

## Who it is for

| Audience | Role / context | Technical level | Primary need |
| -------- | -------------- | --------------- | ------------ |
| Cliente | Pessoa que compra um preço no checkout | Leigo | Pagar e saber se deu certo |
| Admin | Operação que cadastra produto e trata pedido | Intermediário no painel | Ver venda, catálogo e exceção (pago, cancelado, estoque) |
| Gateway | Pagar.me e Asaas, sistemas externos | Máquina | Avisar pagamento e estorno com assinatura |

O perfil “desenvolvedor integrador” aparece em `docs/guides/quitou/01-visao-geral.md`. Neste repositório não há tela nem API pública versionada para terceiros. Fica em aberto até o manager confirmar.

## In initial scope (v1)

O que já dá para demonstrar no código atual, e que o próximo incremento precisa continuar fazendo:

1. O cliente abre um preço, aplica cupom quando existe, e paga no Asaas (à vista ou parcelado) ou no Pagar.me.
2. O cliente acompanha PIX, boleto ou confirmação sem pedir para o suporte “ver se caiu”.
3. O cliente entra com o e-mail, recebe um código, e vê só o próprio perfil e os próprios pedidos.
4. O admin mantém produto, preço, cupom e configuração, e opera pedido e pagamento (inclusive marcar pago, cancelar e recalcular estoque).
5. O webhook do gateway confirma ou estorna sem o admin digitar o status na mão.

O próximo incremento, pedido pelo manager, é esses mesmos atos com os dados num Postgres do VPS, sem projeto Supabase. Não é feature nova de pagamento.

## Out of initial scope

- Self-host do stack Supabase (GoTrue, PostgREST, Realtime, Studio, Storage).
- App nativo iOS ou Android.
- Novo gateway além de Pagar.me e Asaas.
- Senha permanente de cliente. O fluxo atual é código por e-mail.
- Publicar a porta `5432` na internet.
- Reescrever regra de preço, cupom, add-on ou estoque só porque o banco muda.
- Conta de desenvolvedor terceiro com API pública, enquanto isso não for confirmado.

## Known constraints

| Type | Constraint | Impact |
| ---- | ---------- | ------ |
| Team | Mantenedores da instância (`Quitou Contributors`) | Não inventar processo de plantão |
| Timeline | Não há data de corte no repositório | Corte de banco só com ensaio e rollback |
| Legal / compliance | Pagamento e dado pessoal de cliente no Brasil (CPF/CNPJ, endereço, e-mail) | LGPD em `02_security`. PCI do cartão fica no gateway, não no banco da aplicação |
| Technology | Monorepo pnpm. Front Next. Dados hoje no Supabase. VPS Hostinger já existe para outros serviços | Postgres novo é outro compose. Não resetar banco |

## Assumptions

| # | Assumption | Confidence | Validate by |
| - | ---------- | ---------- | ----------- |
| 1 | O produto que importa neste repo é o front de checkout mais o admin, não um SDK vendido separado | medium | Manager confirma se `@quitou/core` tem consumidor fora do monorepo |
| 2 | Produção é um servidor só: Postgres e Next na rede interna, nginx na frente | high | Confirmado pelo manager em 2026-11-10 |
| 3 | Login segue código por e-mail | medium | Manager confirma na aprovação de `00` |
| 4 | Não há titular na União Europeia no escopo atual | low | Manager diz se há cliente fora do Brasil |
| 5 | O serviço de banco cabe leve no VPS: um Postgres com limite de memória, sem o stack Supabase | high | Medir no VPS depois do compose. A conta está no rascunho de migração |

## Open questions

| # | Question | Owner | Target date |
| - | -------- | ----- | ----------- |
| 1 | Qual é o domínio e a região do servidor? | manager | antes do go-live |
| 2 | Quem é o controlador dos dados e o contato do encarregado (LGPD)? | manager | antes de `02` approved |
| 3 | Há cliente ou dado na União Europeia? | manager | antes de `02` approved |
| 4 | Qual URL é produção e quem autoriza desligar o projeto Supabase? | manager | antes do corte |

## Current product state (Mode B only)

**Summary:** O checkout, o webhook, o login por código, o perfil e o painel admin estão implementados em `front-pagamento` e `packages/core`. Persistência, sessão e parte do tempo real passam pelo Supabase. Não há compose de Postgres no repositório. O guia de deploy descreve Vercel mais `supabase db push`.

| Capability | Evidence (path / route) | Confidence |
| ---------- | ----------------------- | ---------- |
| Checkout de um preço | `front-pagamento/src/app/checkout/[priceId]/page.tsx` | high |
| Pagamento Asaas e Pagar.me | `front-pagamento/src/app/api/payments/asaas/checkout/`, `.../pagarme/checkout/` | high |
| Webhook dos gateways | `front-pagamento/src/app/api/payments/asaas/webhook/route.ts`, `.../pagarme/webhook/route.ts` | high |
| Login por código | `front-pagamento/src/components/auth/login-form.tsx` | high |
| Perfil e pedidos do cliente | `front-pagamento/src/app/profile/page.tsx`, `/api/profile` | high |
| Painel admin | `front-pagamento/src/app/admin/` | high |
| Schema `payments` | `front-pagamento/supabase/migrations/` | high |
| Deploy Vercel | `docs/guides/quitou/08-deploy.md` | high |

## Gate

Humano define `status: approved` antes de aprofundar `01_tech_stack` e o trabalho de segurança.
