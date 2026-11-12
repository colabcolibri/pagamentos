# Testes — Quitou

Este documento descreve como rodar os testes, a estrutura de pastas e o escopo de cobertura.

---

## Como rodar

- **Todos os testes do monorepo** (core + front-pagamento):
  ```bash
  pnpm test
  ```
  O script na raiz executa `pnpm --filter @quitou/core test && pnpm --filter @quitou/admin test`.

- **Apenas o core**:
  ```bash
  pnpm --filter @quitou/core test
  ```

- **Apenas o front (admin)**:
  ```bash
  pnpm --filter @quitou/admin test
  ```

- **Watch mode** (re-executar ao alterar arquivos):
  ```bash
  cd packages/core && pnpm exec vitest
  cd front-pagamento && pnpm exec vitest
  ```

**Critério de conclusão:** `pnpm test` deve terminar com código de saída 0.

---

## Runner e configuração

- **Runner:** Vitest (TypeScript e monorepo).
- **Core:** `packages/core/vitest.config.ts` — ambiente `node`, arquivos `src/**/*.test.ts`.
- **Front:** `front-pagamento/vitest.config.ts` — ambiente `node`, arquivos `src/**/*.test.ts` e `*.test.tsx`. PostCSS desabilitado/sobrescrito para evitar conflito com Tailwind no ambiente de teste.

O `tsconfig` do core mantém a exclusão `**/*.test.ts` para que o build (`tsc`) não inclua testes em `dist`. O Vitest usa a própria resolução e não depende do `tsconfig` para rodar os testes.

---

## Estrutura de pastas de teste

Os testes ficam ao lado do código, com sufixo `.test.ts` (ou `.test.tsx`):

| Pacote   | Exemplo |
|----------|---------|
| Core     | `packages/core/src/payments/validators/checkout-body.validators.test.ts` |
| Core     | `packages/core/src/helpers/webhook-logger.test.ts` |
| Front    | `front-pagamento/src/lib/sanitize-html.test.ts` |
| Front    | `front-pagamento/src/app/api/health/route.test.ts` |

Não há pasta dedicada `__tests__`; a convenção é um arquivo `*.test.ts` por módulo alvo.

---

## Escopo de cobertura

| Área | O que é testado |
|------|------------------|
| **Core** | **checkoutBodySchema:** body válido (price_id UUID, customer_info name/email, campos opcionais, installments 1–12); body inválido (price_id não-UUID, email inválido, installments fora de 1–12, sem customer_info, nome vazio). **sanitizeHeaders (webhook-logger):** headers sensíveis (authorization, asaas-access-token, x-api-key, api-key, cookie, x-auth-*) não aparecem no objeto retornado; headers úteis para auditoria são mantidos. |
| **Frontend** | **sanitizeRefundPolicyHtml:** HTML seguro (p, strong, a com href, ul, ol, li, br) permitido; XSS removido ou escapado (script, onerror, onload); entrada não-string retorna string vazia. |
| **API** | **GET /api/health:** retorna 200 e body `{ ok: true }` (teste do handler exportado). POST checkout com body inválido: retorno 400 e detalhes do Zod garantidos indiretamente pelos testes do `checkoutBodySchema` no core. |

---

## Cobertura mínima desejada

- **Caminhos críticos:** validadores de checkout, sanitização de headers no webhook e sanitização de HTML da política de reembolso devem estar cobertos por testes automatizados.
- **Rotas críticas:** pelo menos a rota de health deve ter teste que valide status e body.
- **CI:** o pipeline deve rodar `pnpm test`; todos os testes devem passar para o build ser verde.

---

## Smoke test do checkout (manual)

Para validar o fluxo de checkout antes de testar no front:

```bash
cd front-pagamento
pnpm test:checkout
```

**Pré-requisitos:** Supabase rodando com seed, dev server rodando (`pnpm dev`), `.env.local` configurado.

O script busca um preço ativo, envia POST para `/api/payments/pagarme/checkout` e valida a resposta. Resposta esperada sem auth: `202` com `action: 'email_verification_required'`.

Variáveis opcionais: `PRICE_ID`, `APP_URL` (default: `http://localhost:3004`), `GATEWAY` (default: `pagarme`).

---

## Resumo dos arquivos de teste

| Arquivo | Descrição |
|---------|-----------|
| `packages/core/src/payments/validators/checkout-body.validators.test.ts` | Schema Zod do body de checkout (válido/inválido e opcionais). |
| `packages/core/src/helpers/webhook-logger.test.ts` | Função `sanitizeHeaders`: remoção de headers sensíveis. |
| `front-pagamento/src/lib/sanitize-html.test.ts` | Sanitização de HTML da política de reembolso e XSS. |
| `front-pagamento/src/app/api/health/route.test.ts` | GET /api/health retorna 200 e `{ ok: true }`. |
