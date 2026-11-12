---
title: Test strategy
status: draft
version: 1.0
updated: 2026-11-09
depends_on: [01_tech_stack.md, 04_principles.md, 08_environments.md]
blocks: []
---

# 10 — Test strategy

## Overview

Rascunho do que o repositório já roda. Aprofundar com `/test-pass bootstrap`.

- **Test stack id:** `ts-vitest` no front. O core tem script `test` próprio. Não abri o runner do core além do CI.
- **CI:** `.github/workflows/ci.yml`, descrito em `08_environments.md`. Teste de core e de front bloqueiam o job. Lint não bloqueia.

## Pyramid

| Level | Scope | Target % of tests |
| ----- | ----- | ----------------- |
| Unit | validadores, helpers, rota com mock | a maior parte dos arquivos `*.test.ts` encontrados |
| Integration | `supabase test db` para privilégio de RPC | pouco. Script `test:db`. Não roda no CI lido |
| E2E | fluxo de checkout no navegador | não há runner |

Não há meta de percentual no repo. Não inventar 80%.

## Runners

| Layer | Tool | Config path |
| ----- | ---- | ----------- |
| Unit front | Vitest | script `test` em `front-pagamento/package.json`. Config do Vitest não foi aberta nesta init |
| Unit core | script `test` de `@quitou/core` | `packages/core/package.json` |
| Banco | Supabase CLI `supabase test db` | `front-pagamento/supabase/tests/database/` |
| E2E | nenhum | — |

## Layout

Teste de rota e de helper fica ao lado do arquivo: `route.test.ts`, `*.test.ts`. Teste SQL fica em `front-pagamento/supabase/tests/database/`. Exemplo: `rpc_hardening_grants.test.sql`.

## Coverage

- **Tool:** não há gate de cobertura no CI lido.
- **Threshold:** advisory only. Sem número.
- **Exclusions:** não definidas.

## US conventions

- História Must com `tests: required` cita este doc no plano.
- O passo executado lista o comando (`pnpm --filter @quitou/admin test` ou o filtro do core) antes de `/complete-us`.
- Mudança de função SQL pede o teste de banco quando o ambiente Supabase local existir. No alvo Postgres, o equivalente entra na história, não aqui.

## Manual testing

O guia `docs/guides/quitou/10-testes.md` e os scripts `test:checkout` e `test:pix-pay` são verificação manual contra gateway. Exigem conta sandbox. Não substituem o Vitest. Smoke pós-deploy: `/api/health` e um fluxo crítico, como em `08-deploy.md`.
