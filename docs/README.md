---
title: Quitou docs
status: draft
version: 1.0
updated: 2026-11-09
depends_on: []
blocks: []
---

# Quitou

O Quitou é o checkout e o painel de pagamentos da operação: o cliente paga por Pagar.me ou Asaas, e o admin cuida de produto, pedido e pagamento. Estes arquivos são o contrato de governança do Meridian. Os guias anteriores continuam em `docs/guides/` e não substituem os documentos de fase.

## Phase documents

| Doc | Status | Description |
| --- | ------ | ----------- |
| [00_scope.md](00_scope.md) | draft | Escopo, público e o que já está no ar |
| [01_tech_stack.md](01_tech_stack.md) | draft | Linguagem, framework e infra |
| [02_security.md](02_security.md) | draft | Auth, dados pessoais, segredos |
| [03_user_types.md](03_user_types.md) | draft | Cliente, admin e integrações |
| [04_principles.md](04_principles.md) | draft | Camadas e definição de pronto |
| [05_architecture.md](05_architecture.md) | draft | Estrutura do sistema. Trava do backlog |
| [06_database.md](06_database.md) | draft | Schema `payments` e migrações |
| [07_api_contracts.md](07_api_contracts.md) | draft | Rotas HTTP e webhooks |
| [08_environments.md](08_environments.md) | draft | Local, CI, variáveis |
| [09_design_system.md](09_design_system.md) | draft | UI web. Aprofunda com `/design-pass` |
| [10_test_strategy.md](10_test_strategy.md) | draft | Vitest e o que o CI roda |
| [12_marketing_seo.md](12_marketing_seo.md) | draft | Superfície pública indexável |
| [11_decisions.md](11_decisions.md) | draft | Regras do log. Entradas no SQLite |
| [inventory/as-is.md](inventory/as-is.md) | draft | Inventário transitório do código atual |

## Delivery artifacts

| Artifact | Location | Role |
| -------- | -------- | ---- |
| Epics, versions, sprints, user stories | `.meridian/meridian.db` | Entrega canônica |
| Decision log entries | `.meridian/meridian.db` → `decisions` | Só prepend |
| Kit templates | `.agent/references/templates/` | Contrato dos agentes. Não copiar para `docs/templates/` |

Não há `docs/us/`. O rascunho `guides/quitou/migracao-postgres-vps.md` é insumo da conversa, não história oficial.

## How to work

1. Aprovar os documentos na ordem: `00` → `01` → `02` → `03` → `04` → **`05`** → detalhes.
2. UI: `/design-pass bootstrap` em `09` depois que `01` estiver rascunhado.
3. Testes: `/test-pass bootstrap` em `10` depois de `01` e `08`.
4. Com `05_architecture` em **`approved`**: `/create-epic` → `/create-version` → `/plan-sprint` → `/create-us`.
5. Por história: `/refine-us` → `/implement-us` → `/complete-us` (commit humano).
6. Validar: `python3 .agent/scripts/validate_meridian.py .`

## Meridian kit (if present)

| Resource | Path |
| -------- | ---- |
| Protocol | `.agent/MERIDIAN.md` |
| Agents help | `.agent/references/guides/agents-help.md` |
| Start here | `.agent/references/guides/start-here.md` |

## Guias anteriores ao Meridian

Índice que já existia neste arquivo, preservado para navegação. Não é fonte de status.

### Desenvolvimento

- [Leia primeiro](guides/guia-desenvolvimento/00-LEIA-ME-PRIMEIRO.md)
- [Estrutura](guides/guia-desenvolvimento/01-estrutura-organizacao.md)
- [Componentes UI](guides/guia-desenvolvimento/02-componentes-ui.md)
- [API routes e services](guides/guia-desenvolvimento/03-api-routes-services.md)
- [Repositories](guides/guia-desenvolvimento/04-repositories-validators.md)
- [Hooks](guides/guia-desenvolvimento/05-hooks-tanstack-query.md)
- [Erros e log](guides/guia-desenvolvimento/06-error-handling-logging.md)
- [Migrações](guides/guia-desenvolvimento/11-migrations-seguras-performance.md)

### Produto de pagamento

- [Visão geral](guides/quitou/01-visao-geral.md)
- [Arquitetura legada](guides/quitou/02-arquitetura.md)
- [Pagamentos](guides/quitou/03-pagamentos.md)
- [Checkout](guides/quitou/04-checkout.md)
- [Webhooks](guides/quitou/05-webhooks.md)
- [Admin](guides/quitou/06-admin.md)
- [Deploy](guides/quitou/08-deploy.md)
- [Testes](guides/quitou/10-testes.md)

### Design

- [Visão da plataforma](guides/guia-design/00-VISAO-PLATAFORMA.md)
- [Layout](guides/guia-design/01-estrutura-layout.md)
- [Cores](guides/guia-design/02-sistema-cores.md)
- [Tipografia](guides/guia-design/03-tipografia.md)
- [Responsividade](guides/guia-design/05-responsividade-breakpoints.md)
