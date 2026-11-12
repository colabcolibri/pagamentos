---
title: Tech Stack
status: draft
version: 1.0
updated: 2026-11-09
depends_on: [00_scope.md]
blocks: [02_security.md, 04_principles.md, 08_environments.md, 09_design_system.md, 10_test_strategy.md]
---

# 01 — Tech stack

## Summary

O cliente e o admin usam o app Next em `front-pagamento`. A regra de gateway mora em `@quitou/core`. Os dados hoje estão no Postgres do Supabase, acessados pelo cliente JavaScript do Supabase, não por SQL direto. O CI em GitHub Actions usa Node 22 e pnpm 9. A direção pedida, ainda não refletida no código, é Postgres 16 num compose no VPS, com o processo Next ao lado.

## Runtime and language

| Layer | Technology | Version (if pinned) | Rationale |
| ----- | ---------- | ------------------- | --------- |
| Primary language | TypeScript | front `typescript` no package do app | Checkout e core compartilham tipos |
| Runtime | Node.js | 22 no `.github/workflows/ci.yml` | Alvo do CI. Versão local do desenvolvedor não está pinada no repo além disso |
| Package manager | pnpm | 9 no CI. Workspace em `pnpm-workspace.yaml` | Monorepo `packages/*` e `front-pagamento` |
| App | Next.js | `^16.1.0` em `front-pagamento/package.json` | App Router, rotas de API e UI no mesmo serviço |
| UI | React | `19.2.1` | Base do Next deste repo |

O guia antigo diz Next 15. O `package.json` do front declara Next 16. O manifesto do pacote vale.

## Application surfaces

| Surface | Framework / host | Path in repo | Notes |
| ------- | ---------------- | ------------ | ----- |
| Web app | Next.js | `front-pagamento/src/app/` | Checkout, login, perfil, admin, página inicial |
| API / backend | Route handlers no mesmo Next | `front-pagamento/src/app/api/` | Não há serviço HTTP separado |
| Domínio de pagamento | Biblioteca interna | `packages/core` | Handlers de checkout e webhook, sem UI |
| CLI | — | n/a | Scripts pontuais em `front-pagamento/scripts/`, não são produto |
| Extension / desktop | — | n/a | |
| Mobile | — | n/a | Fora de escopo |

## Data layer

| Concern | Choice | Config / path | Notes |
| ------- | ------ | ------------- | ----- |
| Primary database | PostgreSQL 16 | `DATABASE_URL` só no servidor | Schema `payments`. No VPS o host é o serviço `postgres`, sem porta no host. Local: `127.0.0.1:5435` |
| ORM / client | `pg` | `front-pagamento/src/lib/db/` | Não há Drizzle, Prisma, Kysely nem cliente de navegador para o banco |
| Migrations | SQL aplicado no Postgres | `front-pagamento/db/migrations/` | Nome `YYYYMMDDHHMMSS`. Não usar reset de banco |
| File / object storage | nenhum no repo | — | Sem bucket Supabase Storage encontrado nas migrações lidas |
| Cache | memória do processo para rate limit | `docs/guides/quitou/08-deploy.md` | Não há Redis no código lido |

Estado de tela no cliente: TanStack Query `^5.90.2`.

## Infrastructure and hosting

| Environment | Provider | Region | Notes |
| ----------- | -------- | ------ | ----- |
| Local | máquina do desenvolvedor | — | `pnpm --filter @quitou/admin dev` na porta 3004 |
| Staging | o mesmo padrão do servidor, noutro host ou noutro domínio | não documentada | Sandbox de gateway. Sem preview automático |
| Production | um servidor (Hostinger ou outro VPS) | a confirmar com o gestor | Nginx na frente, Next e Postgres na rede interna. Sem Vercel |

E-mail transacional: SMTP (o guia cita Brevo). Variáveis `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` no guia de deploy.

## Dev tooling

| Tool | Purpose | Config file |
| ---- | ------- | ----------- |
| Bundler / compiler | Next com Turbopack. Core com o build do próprio pacote | `front-pagamento/package.json` scripts `dev` e `build` |
| Linter | ESLint no front. CI com `continue-on-error: true` | script `lint` de `@quitou/admin` |
| Formatter | Prettier via lint-staged | `package.json` da raiz, `scripts/lint-staged-front.mjs` |
| Unit test runner | Vitest no front. Teste do core no script `test` | `front-pagamento` script `test`. `packages/core` script `test` |
| Banco local de teste | `supabase test db` | script `test:db` |
| E2E runner | não há Playwright nem Cypress no `package.json` lido | — |
| Git hook | Husky + lint-staged | `package.json` da raiz, script `prepare` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

## UI stack signals (if applicable)

- [x] Web UI → create `09_design_system.md`; run `/design-pass bootstrap`
- [x] Automated tests in scope → create `10_test_strategy.md`; run `/test-pass bootstrap`

**Suggested UI stack id:** `ts-shadcn` (Radix, Tailwind, `class-variance-authority`, pasta de componentes UI)

**Suggested test stack id:** `ts-vitest`

## Discarded alternatives

| Option | Why rejected |
| ------ | ------------ |
| Continuar no Supabase Cloud | O manager pediu Postgres simples no VPS que já roda outros serviços |
| Self-host do Supabase em Docker | Mantém GoTrue, PostgREST e Realtime. É o oposto de serviço leve |
| Postgres com porta pública para a Vercel | Conexão do browser ou da plataforma serverless no banco exposto. Fora do desenho |

O padrão de produção é um servidor só. A Vercel não entra no build nem na URL da aplicação. Guias antigos com esse nome ficam como histórico.

## Evidence (Mode B)

| Claim | Source file |
| ----- | ----------- |
| Monorepo pnpm | `pnpm-workspace.yaml`, `package.json` |
| Next 16, React 19, Supabase JS, TanStack Query | `front-pagamento/package.json` |
| Node 22 e pnpm 9 no CI | `.github/workflows/ci.yml` |
| Schema SQL | `front-pagamento/db/migrations/` |
| Deploy Vercel | `docs/guides/quitou/08-deploy.md` |
| Core de gateway | `packages/core/package.json` |

## Gaps / open questions

| # | Unknown | Blocker for |
| - | ------- | ----------- |
| 1 | Host de produção definitivo (Vercel ou VPS) | `05_architecture`, `08_environments` |
| 2 | SQL antigo em `front-pagamento/supabase/migrations/` não é aplicado. O boot usa `db/migrations` | `06_database` |
| 3 | Versão local mínima de Node fora do CI | `08_environments` |

## Gate

Humano aprova antes de `/security-pass bootstrap` e do trabalho de arquitetura.
