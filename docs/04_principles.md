---
title: Code Principles
status: draft
version: 1.0
updated: 2026-11-09
depends_on: [01_tech_stack.md, 02_security.md, 03_user_types.md]
blocks: [05_architecture.md]
---

# 04 — Principles

Derivado do código e dos guias em `docs/guides/guia-desenvolvimento/`. Precisa de revisão humana antes de `approved`. Não é norma nova inventada nesta init.

## DRY — where each type of logic lives

| Concern | Single source of truth | Path / package |
| ------- | ---------------------- | -------------- |
| Domain rules / business logic | handlers de gateway e cálculo de preço | `packages/core/src/` |
| Validation schemas | validadores de checkout e de produto | `packages/core/src/payments/validators/`, `front-pagamento/src/lib/payments/product/product.validators.ts` |
| API clients / SDK wrappers | chamadas Asaas e Pagar.me | `packages/core` |
| UI primitives (read-only) | componentes shadcn | `front-pagamento/src/components/ui/` |
| Composed UI templates | checkout, admin, pagamento | `front-pagamento/src/components/` |
| Constants / enums | conteúdo de tela e rótulos | arquivos `content.ts` ao lado da feature, quando existem |
| Scripts / CLI | operação local, não produto | `front-pagamento/scripts/` |
| Env | leitura lazy com validação | `front-pagamento/src/lib/config/env.ts` |

**Duplication policy:** texto de UI não se repete dentro do componente se já existe `content.ts`. Regra de preço não se duplica na página. O guia pede factory para injetar repositório. Há `supabase-product.repository.ts` e `service-factory.ts`. Copiar SQL para o componente é fora do padrão.

## Single responsibility — layers

| Layer | Responsibility | May import from | Must not |
| ----- | -------------- | --------------- | -------- |
| Domain / core | gateway, validação, efeito de checkout | tipos e HTTP do provedor | componente React, `next/navigation` |
| Application / use cases | route handler fino, guard, orquestração | core, repositório, env de servidor | JSX |
| Infrastructure | cliente Supabase hoje. SQL no futuro | driver e env | regra de preço |
| UI / presentation | página, hook, formulário | API via fetch ou server action já existente | connection string, service role, SQL |
| Scripts / kit | teste manual, tipo gerado, Meridian | — | atalho que grava produção |

Alinha com o guia: Client → Hook → API Route → Service → Repository → Database.

## SOLID (project-specific)

| Principle | How we apply it here |
| --------- | -------------------- |
| SRP | route handler não calcula preço. Isso fica no core ou no service |
| OCP | gateway novo entra como rota e validador novos, sem misturar Asaas dentro do Pagar.me |
| LSP | repositório de produto troca a implementação (Supabase hoje, SQL depois) sem a página conhecer o driver |
| ISP | o cliente de browser não recebe o cliente admin |
| DIP | service recebe repositório. `front-pagamento/src/lib/payments/factories/service-factory.ts` |

## Definition of Done (team-wide)

A user story is done when:

- [ ] All Acceptance items verified with evidence in `## Record`
- [ ] `tests: required` → `tests_status: done` and commands in Record § Executed
- [ ] No new linter **errors** (warnings documented if accepted). O CI hoje não bloqueia lint do front
- [ ] Security-sensitive US → `/security-review` or Plan cites `02_security`
- [ ] UI Must US → Plan cites `09_design_system` when approved
- [ ] Human manager reviewed diff; one commit per US (policy)
- [ ] Migration, se houver, é um arquivo SQL com data `YYYYMMDDHHMMSS`. Sem `db reset`

## Mandatory conventions

| Area | Rule | Tool / config |
| ---- | ---- | ------------- |
| Naming | arquivo e pasta em kebab-case, como o guia `09-convencoes-nomenclatura.md` | revisão no PR |
| Imports | path `@/` no front. Import só depois do uso, para o lint não apagar import solto | ESLint do front |
| Commits | conventional, quando o fluxo de commit do time for usado | skill de commit. Não é gate do CI |
| Branching | não documentado | — |
| Language | docs de produto e UI em português do Brasil. Identificador de código em inglês, como o repo já está | — |
| UI | sem overflow horizontal. Breakpoints em `docs/guides/guia-design/05-responsividade-breakpoints.md` | revisão visual |

## Error handling

| Layer | Pattern | User-visible | Logged |
| ----- | ------- | ------------ | ------ |
| API | `{ error, code, details? }` em `apiErrorResponse` | mensagem e código | stack só fora de produção, via `error-handler.ts` |
| UI | toast (sonner) e texto de campo no checkout | mensagem curta | não logar documento nem código OTP |
| CLI | scripts manuais | stdout | não é contrato de produto |

Erro de banco conhecido passa por mapa em `front-pagamento/src/lib/errors/error-handler.ts`. Em produção a mensagem de SQL não vai para o cliente.

## Security-aware coding

- Não logar segredo, código OTP, documento completo nem connection string.
- Toda escrita de admin e de perfil confere sessão no servidor.
- Preço cobrado é o do servidor, não o número que o browser enviou.
- Webhook sem segredo válido não grava pagamento.
- Chave de serviço e `DATABASE_URL` não entram em variável `NEXT_PUBLIC_`.

## Gaps / open questions

| # | Topic | Owner |
| - | ----- | ----- |
| 1 | O lint do front não falha o CI (`continue-on-error`). A definição de pronto fala em erro de lint. O manager decide se o CI passa a bloquear | manager |
| 2 | Parte do código ainda usa `any` no helper de auth do core | revisão quando a auth mudar |

## Gate

Humano `approved` antes de fechar a arquitetura.
