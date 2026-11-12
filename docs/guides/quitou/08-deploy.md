# Deploy e rollback — Quitou

> Histórico. O deploy vigente é um servidor só, em `docs/08_environments.md`. Não seguir a Vercel descrita abaixo.

---

## Deploy (Vercel)

- **Build:** O projeto usa `rootDirectory: front-pagamento`. O `buildCommand` na raiz executa `pnpm install`, build do `@quitou/core` e build do front. Validar em um deploy de preview que o build conclui e o output (`.next`) é o esperado.
- **Variáveis de ambiente:** Configurar no dashboard da Vercel (Production e Preview) todas as variáveis listadas em `front-pagamento/.env.example`. Em **Preview** usar apenas contas **sandbox** (Pagar.me, Asaas) e Supabase de staging. Em **Production** usar chaves de produção e URLs de webhook **diferentes** das de staging.
- **Webhooks:** Ter duas URLs configuradas nos gateways (Pagar.me/Asaas): uma para staging (ex.: preview ou subdomínio) e outra para produção. Nunca usar a mesma URL para os dois ambientes.

---

## Rollback (Vercel)

1. Abrir **Vercel Dashboard** → projeto → **Deployments**.
2. Localizar o deployment **anterior** estável (status Success).
3. Clicar nos três pontos (⋯) do deployment → **Promote to Production**.
4. Confirmar a promoção.
5. **Verificação pós-rollback:** acessar a URL de produção, testar health (`/api/health` quando existir) e um fluxo crítico (ex.: login ou página de checkout).

---

## Migrations (Supabase)

- **Onde:** `front-pagamento/supabase/migrations/`. Ordem de aplicação: numeração/ordem alfabética (001, 002, … 019, 20250312180000, …).
- **Quando:** Aplicar migrations **antes** (ou no mesmo ciclo) do deploy que depende das mudanças. Ex.: rodar `supabase db push` (ou aplicar manualmente no Supabase Dashboard) antes de promover o deploy.

### Rollback de migrations

Este projeto **não usa down automático**. Para reverter uma alteração de schema:

1. **Não** executar `supabase db reset` nem comandos que apaguem o banco.
2. Criar uma **nova** migration com timestamp e nome explícito, ex.: `20250313120000_rollback_xxx.sql`.
3. Na migration de rollback: desfazer apenas a alteração desejada (ex.: recriar constraint antiga, redefinir função, remover índice). Manter compatibilidade com o código que ainda está em produção até o próximo deploy.
4. Testar a migration de rollback **em staging** (restore de backup ou ambiente espelho) antes de aplicar em produção.
5. Aplicar em produção no mesmo fluxo das demais migrations (`supabase db push` ou SQL no Dashboard).

---

## Staging vs produção

- **Preview (Vercel):** usar **apenas** contas sandbox do Pagar.me e Asaas; Supabase de staging (ou projeto separado). URLs de webhook apontando para o domínio de preview.
- **Production:** chaves de produção; Supabase de produção; URLs de webhook **diferentes** das de staging. Nunca reutilizar a mesma URL de webhook nos dois ambientes.
- **Variáveis:** `NEXT_PUBLIC_APP_URL` e demais env devem estar configurados por ambiente no dashboard da Vercel (Settings → Environment Variables: Preview vs Production).

---

## Rate limiting

- **Middleware** (`front-pagamento/middleware.ts` reexporta `proxy.ts`). Os tetos atuais estão em `docs/02_security.md`. Este guia não é a fonte do número. Resposta 429 com `{ error, code: 'RATE_LIMITED' }`.
- **Store:** in-memory (por instância). Em produção com várias instâncias, o limite é por instância; para limite global use **Vercel Rate Limit** (Pro) ou **Upstash Redis** com `@upstash/ratelimit` no middleware.

---

## Checklist: antes do deploy

### Antes do primeiro deploy em staging (Preview)

- [ ] Variáveis no dashboard Vercel (Environment: **Preview**): todas as de `front-pagamento/.env.example`.
- [ ] **Preview** usa apenas **sandbox**: defina `PAGARME_ENVIRONMENT=sandbox` e `ASAAS_ENVIRONMENT=sandbox`; chaves de sandbox do Pagar.me e Asaas.
- [ ] `DATABASE_URL` do processo aponta para o Postgres desse ambiente. Não há chave anônima nem URL de banco no bundle.
- [ ] URLs de webhook nos gateways (Pagar.me/Asaas) apontam para a URL de **Preview** (ex.: `https://xxx-preview.vercel.app/api/...`). Não usar a mesma URL de produção.
- [ ] `NEXT_PUBLIC_APP_URL` = URL do preview (ex.: `https://xxx-preview.vercel.app`).

### Antes do deploy em produção

- [ ] Variáveis no dashboard Vercel (Environment: **Production**): todas as necessárias, com valores de **produção**.
- [ ] Chaves de **produção** do Pagar.me e Asaas. Não defina `PAGARME_ENVIRONMENT`/`ASAAS_ENVIRONMENT` (default = production).
- [ ] `DATABASE_URL` de produção aponta para o Postgres do servidor, sem porta publicada no host.
- [ ] **Webhook secrets** configurados: `PAGARME_WEBHOOK_USER`, `PAGARME_WEBHOOK_SECRET`, `ASAAS_WEBHOOK_SECRET` (obrigatórios em prod; a aplicação falha no start se faltar).
- [ ] **Email (sistema):** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` configurados para envio de emails do sistema (OTP, pedido criado, pagamento confirmado). Ex.: Brevo — host `smtp-relay.brevo.com`, porta 587, login e chave SMTP em [SMTP e API](https://app.brevo.com/settings/keys/smtp). Sem isso, emails em produção falham.
- [ ] URLs de webhook nos gateways apontam para o domínio de **produção**; devem ser **diferentes** das de staging.
- [ ] `NEXT_PUBLIC_APP_URL` = URL de produção.

### Validação pós-deploy

Após cada deploy (preview ou produção), validar:

1. **Build:** Deploy concluído com sucesso (Build log: `pnpm install`, build do core, build do front).
2. **Health:** `GET {APP_URL}/api/health` retorna 200 e `{ "ok": true }`.
3. **Fluxo crítico:** Login (se aplicável), página de checkout, e ao menos um pagamento de teste (sandbox em preview).
4. **Webhooks (produção):** Após um pagamento de teste em prod, confirmar que o webhook foi recebido e o pedido atualizado (ex.: status no profile ou admin).

Se algo falhar, usar o rollback (seção anterior) e investigar antes de novo deploy.
