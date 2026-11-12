---
title: Environments
status: draft
version: 1.0
updated: 2026-11-10
depends_on: [01_tech_stack.md, 05_architecture.md]
blocks: [10_test_strategy.md]
---

# 08 — Environments

## Environment matrix

| Environment | Purpose | URL / access | Data | Deploy trigger |
| ----------- | ------- | ------------ | ---- | -------------- |
| local | desenvolvimento | `http://localhost:3004` | Postgres do compose em `127.0.0.1:5435`. Não usar produção | manual |
| staging | ensaio | outro domínio no mesmo padrão de servidor | sandbox de gateway | manual, no host de ensaio |
| production | venda real | `NEXT_PUBLIC_APP_URL` de produção | Postgres do mesmo servidor e chaves de produção | publicar o build no host |

Produção é um servidor só. O Next e o Postgres moram na mesma máquina. O nginx é a única porta pública. Hostinger aqui significa o VPS (KVM), não o plano de site PHP. Qualquer VPS com Docker, Node 22 e nginx segue o mesmo passo.

## O que sobe no servidor

É um monólito de aplicação. Um processo Node serve a página e a API. `packages/core` é biblioteca desse processo, não um segundo serviço. O Postgres é o único outro processo, na rede Docker, sem porta na internet.

| Peça | Onde escuta | Quem alcança |
| ---- | ----------- | ------------ |
| Nginx | 80 e 443 no host | a internet |
| Next (`next start`) | `127.0.0.1:3004` | só o nginx |
| Postgres | `postgres:5432` na rede `quitou-db`. No notebook, também `127.0.0.1:5435` | só o Next |

Firewall do VPS: liberar 22, 80 e 443. Não liberar 5435 nem 3004.

## Subir na Hostinger ou num VPS parecido

1. Criar um VPS com Ubuntu. Instalar Docker, o plugin Compose, Node 22, pnpm 9, nginx e certbot. Não usar o hospedagem compartilhada de PHP: o Next precisa de processo contínuo.
2. Clonar o repositório. Não colocar `.env` no git. O caminho curto é o `compose.yml` da raiz: ele sobe Postgres sem porta no host, aplica `front-pagamento/db/migrations` e publica o app na porta 3004.
3. Banco. Copiar `deploy/postgres/.env.example` para `deploy/postgres/.env` e definir `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`. Subir:

```bash
docker compose --env-file deploy/postgres/.env \
  -f deploy/postgres/compose.yml \
  -f deploy/postgres/compose.vps.yml up -d
```

`compose.vps.yml` tira a porta `127.0.0.1:5435`. No VPS o banco fica só na rede `quitou-db`, no mesmo isolamento dos outros composes. No notebook continua só o `compose.yml`, com a porta local.

4. Aplicar, nesta ordem, os arquivos de `front-pagamento/db/migrations/`: `20261109194700_payments_schema.sql`, `20261109195200_payments_integrity.sql`, `20261109200500_access_codes_and_sessions.sql`, `20261110140039_admin_audit_events.sql`, `20261110140718_gateway_settings.sql`, `20261111164836_integration_keys.sql`. Pelo `psql` do container. Sem `db reset` e sem apagar o volume `quitou_pg_data`.
5. Env da aplicação em `front-pagamento/.env.local` no servidor, a partir de `.env.example`. Obrigatórios para o processo:

```bash
# gere um valor novo em cada servidor. Não reuse o do notebook.
openssl rand -hex 32
```

Esse valor vai em `ACCESS_CODE_SECRET`. Também entram `DATABASE_URL` (`postgres://USUARIO:SENHA@postgres:5432/quitou`, com o Next na rede `quitou-db`), `NEXT_PUBLIC_APP_URL` com o `https` do domínio, `TRUSTED_PROXY=1`, as chaves de Pagar.me e Asaas, o SMTP e `ADMIN_EMAIL`. `NODE_ENV=production` no processo. Não definir `DISABLE_API_RATE_LIMIT`.
6. Build e processo:

```bash
pnpm install --frozen-lockfile
pnpm --filter @quitou/core build
pnpm --filter @quitou/admin build
pnpm --filter @quitou/admin start
```

O `start` usa a porta 3000 do Next, a menos que `PORT=3004`. No systemd, definir `PORT=3004` e `WorkingDirectory` em `front-pagamento`, com `EnvironmentFile` apontando para o `.env.local`. `Restart=always`.
7. Nginx no domínio, proxy para `http://127.0.0.1:3004`. Enviar `X-Forwarded-For` e `X-Forwarded-Proto`. O certificado fica no certbot (`certbot --nginx`). Sem isso o cookie `secure` e o webhook HTTPS não fecham.
8. No painel do Pagar.me e do Asaas, a URL de webhook é `https://SEU_DOMINIO/api/payments/pagarme/webhook` e `https://SEU_DOMINIO/api/payments/asaas/webhook`. O segredo configurado lá é o mesmo do env.
9. Backup diário, no cron do host, a partir do diretório do clone: `15 3 * * * cd /caminho/do/clone && ./deploy/postgres/backup.sh /var/backups/quitou`.
10. Rollback: parar o processo, voltar o git para o build anterior, `pnpm --filter @quitou/admin build` e subir de novo. O volume do Postgres fica. Não apagar banco para desfazer um deploy.

No notebook o mesmo `ACCESS_CODE_SECRET` já está em `front-pagamento/.env.local`. Esse valor não vai para o git nem para o servidor. Cada máquina gera o seu.

## Local development

### Prerequisites

| Tool | Version | Install |
| ---- | ------- | ------- |
| Node.js | 22 no CI | o guia local não pina outra versão |
| pnpm | 9 no CI | habilitar via corepack ou instalador do pnpm |
| Docker | compose do Postgres local | `deploy/postgres/compose.yml`, porta `127.0.0.1:5435` |

### First-time setup

```bash
git clone <repositório>
cd quitou
pnpm install
cp front-pagamento/.env.example front-pagamento/.env.local
# preencher chaves locais. Não commitar.

pnpm --filter @quitou/core build
pnpm --filter @quitou/admin dev
```

O app sobe na porta 3004. As migrações locais são os SQL de `front-pagamento/db/migrations/`, na ordem da seção do servidor. Não rodar `supabase db reset` nem apagar o volume. `ACCESS_CODE_SECRET` entra no `.env.local` com `openssl rand -hex 32`. Sem essa variável o pedido de código não sobe.

### Daily commands

| Task | Command |
| ---- | ------- |
| Start dev | `pnpm --filter @quitou/admin dev` |
| Run tests | `pnpm test` na raiz, ou os filtros do CI |
| Lint | `pnpm --filter @quitou/admin lint` |
| Validate Meridian | `python3 .agent/scripts/validate_meridian.py .` |

## Environment variables

Nomes lidos em `front-pagamento/src/lib/config/env.ts` e no guia de deploy. Valores reais não entram aqui.

| Variable | Required | Secret | Purpose | Example (non-secret) |
| -------- | -------- | ------ | ------- | -------------------- |
| `NEXT_PUBLIC_APP_URL` | sim | não | origem pública. No servidor, o https do domínio | `http://localhost:3004` |
| `NEXT_PUBLIC_AUTH_COOKIE_NAME` | não | não | nome do cookie | `quitou_token` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | não | não | domínio compartilhado | — |
| `PAGARME_SECRET_KEY` | sim | sim | API Pagar.me | — |
| `PAGARME_WEBHOOK_USER` | sim em produção | sim | webhook | — |
| `PAGARME_WEBHOOK_SECRET` | sim em produção | sim | webhook | — |
| `PAGARME_ENVIRONMENT` | não | não | `sandbox` ou `production` | `sandbox` |
| `ASAAS_API_KEY` | sim | sim | API Asaas | — |
| `ASAAS_WEBHOOK_SECRET` | sim em produção | sim | webhook | — |
| `SMTP_HOST`, `SMTP_PORT` | sim | não | OTP e aviso de pedido | dev: `127.0.0.1` e `1025` (Mailpit, caixa em `http://localhost:8025`). Produção: Resend |
| `SMTP_USER`, `SMTP_PASS` | sim em produção | senha sim | autenticação SMTP | no Mailpit ficam vazios |
| `DATABASE_URL` | sim, só no servidor | sim | Postgres | no VPS, `postgres://quitou@postgres:5432/quitou`. No notebook, `127.0.0.1:5435` |
| `ADMIN_EMAIL` | não | não | promove este e-mail a admin no login | `admin@example.com` |
| `BRAND_NAME` | não | não | nome da instância. Vazio usa Quitou | `Quitou` |
| `BRAND_TAGLINE` | não | não | frase da home e a description | — |
| `BRAND_LOGO_SRC` | não | não | caminho em `public/`. Arquivo ausente mostra o nome | `/brand/logo.svg` |
| `BRAND_LEGAL_NAME`, `BRAND_CNPJ` | não | não | linha legal do rodapé e do e-mail de contato | — |
| `BRAND_SUPPORT_EMAIL` | não | não | suporte e modelos de reembolso | — |
| `BRAND_CONTACT_EMAIL` | não | não | destino do formulário de contato | — |
| `BRAND_PRIVACY_URL`, `BRAND_TERMS_URL` | não | não | links do rodapé | — |
| `ACCESS_CODE_SECRET` | sim | sim | HMAC do código de acesso | — |
| `TRUSTED_PROXY` | sim no servidor | não | `1` porque o nginx reescreve `X-Forwarded-For` | `1` |
| `DISABLE_API_RATE_LIMIT` | não | não | `1` desliga o limite. Proibido em produção | — |
| `NEXT_PUBLIC_UMAMI_SRC` | não | não | script da instalação Umami | `https://umami.exemplo.com/script.js` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | não | não | id do site no painel do Umami | — |

**Rules:** documentar chave nova em `front-pagamento/.env.example`. Não commitar valor. Ver `02_security`.

## Staging

| Attribute | Value |
| --------- | ----- |
| Host | outro servidor, ou o mesmo com outro domínio de ensaio |
| Deploy | o mesmo padrão da produção: nginx, Next, Postgres interno |
| Smoke test URL | a URL de ensaio mais `/api/health` |

Sandbox apenas. Webhook de staging não pode ser a URL de produção.

## Postgres no VPS

Compose em `deploy/postgres/compose.yml`. Não publica a porta `5432`. Cria a rede Docker `quitou-db` e o volume `quitou_pg_data`.

| Variable | Required | Secret | Purpose | Example (non-secret) |
| -------- | -------- | ------ | ------- | -------------------- |
| `POSTGRES_USER` | sim | não | usuário do banco | `quitou` |
| `POSTGRES_PASSWORD` | sim | sim | senha do banco | — |
| `POSTGRES_DB` | não | não | nome do database | `quitou` |

Copiar `deploy/postgres/.env.example` para `deploy/postgres/.env`. O arquivo `.env` não entra no git. Na máquina local a porta publicada é `127.0.0.1:5435`, porque a 5432 já pertence a outro compose. No VPS o segundo arquivo tira essa porta.

```bash
docker compose --env-file deploy/postgres/.env \
  -f deploy/postgres/compose.yml \
  -f deploy/postgres/compose.vps.yml up -d
```

Conexão local: `postgres://quitou@127.0.0.1:5435/quitou`. A senha não entra na documentação.

O primeiro admin nasce depois que a pessoa entra com o código de e-mail, porque `admin_users.id` é o id do perfil. No `psql` do container:

```sql
INSERT INTO payments.admin_users (id, email, name, role, is_active)
SELECT id, email, name, 'admin', true
FROM payments.profiles
WHERE email = 'voce@exemplo.com';
```

Não usa service role. `is_active = false` tira o acesso sem apagar o perfil.

O container fica em 1 GB, com `max_connections=30` e `shared_buffers=128MB`. Sobe o limite se as conexões ativas passarem de 20 de forma sustentada. Não há PgBouncer.

Backup, no host, para uma pasta fora do volume:

```bash
./deploy/postgres/backup.sh "$HOME/backups/quitou"
```

O script grava `quitou-<data>.dump` em formato custom e fica com as sete cópias mais novas. Sem o diretório, o exit code é 2. Agendamento, quando o mesmo compose estiver no VPS:

```cron
15 3 * * * cd /caminho/do/repo && ./deploy/postgres/backup.sh /var/backups/quitou
```

Restore de prova, sem senha no comando. O `pg_restore` roda dentro do container, que já tem o usuário do env:

```bash
docker compose --env-file deploy/postgres/.env -f deploy/postgres/compose.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS quitou_restore_proof;" -c "CREATE DATABASE quitou_restore_proof;"'
docker compose --env-file deploy/postgres/.env -f deploy/postgres/compose.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d quitou_restore_proof --no-owner --no-acl < "$HOME/backups/quitou/quitou-AAAAMMDDHHMMSS.dump"
```

Depois da comparação, apagar só o database de prova: `DROP DATABASE quitou_restore_proof`. Não apagar o volume `quitou_pg_data`.

## Production

| Attribute | Value |
| --------- | ----- |
| Host | um servidor. Nginx na 443, Next e Postgres na rede interna. Nada na Vercel |
| Deploy | build no host ou artefato enviado para ele. `NEXT_PUBLIC_APP_URL` é o domínio público |
| Rollback | subir o build anterior. O volume `quitou_pg_data` permanece. Sem `db reset` e sem `docker volume rm` |
| Production approver | manager. Credencial de produção é ação humana |

### Corte para o Postgres do VPS

Quem clona sobe com o `compose.yml` da raiz. O Postgres não publica porta. O serviço `migrate` aplica os SQL de `front-pagamento/db/migrations` uma vez e o `web` espera essa etapa. A URL pública é `NEXT_PUBLIC_APP_URL`. A marca (`BRAND_*`) entra no ambiente do processo, não no build. Credencial de produção não entra neste arquivo.

1. O Postgres sobe com `compose.yml` e `compose.vps.yml`. Não publicar `5432` em `0.0.0.0`. O Next entra na rede `quitou-db` e usa o serviço `postgres`.
2. As migrações já estão aplicadas no volume `quitou_pg_data`. Num volume novo, a ordem é `20261109194700_payments_schema.sql`, `20261109195200_payments_integrity.sql`, `20261109200500_access_codes_and_sessions.sql`, `20261110140039_admin_audit_events.sql`, `20261110140718_gateway_settings.sql`, `20261111164836_integration_keys.sql`. Sem reset. A migração `20261112020800_mcp.sql` entra quando essa release for publicada.
3. O backup do volume é `./deploy/postgres/backup.sh /var/backups/quitou`.
4. A URL pública dos webhooks de Asaas e Pagar.me continua a do domínio. O processo não recebe URL de banco no browser.
5. Checklist no gateway de teste, pela pessoa que opera: checkout à vista, checkout parcelado, webhook confirmado, cupom, login por código, pedido no admin, marcar como pago e recalcular estoque. Esse ensaio ainda não foi executado.
6. Se um passo falhar, publicar a release anterior no mesmo volume. Não executar `DROP DATABASE` nem `docker volume rm quitou_pg_data`.
7. Com o compose estável no VPS, o backup diário é o cron já descrito: `15 3 * * *`.

## Deploy and release

| Step | Environment | Trigger | Approver | Rollback |
| ---- | ----------- | ------- | -------- | -------- |
| Build artifact | CI | push e pull request em `main` ou `master` | automatizado | n/a |
| Promote staging | host de ensaio | manual | quem opera o servidor | recolocar o build anterior |
| Promote production | o servidor de produção | manual | manager | recolocar o build anterior |

**Secrets in CI:** o workflow de build injeta placeholders, não segredo real. Segredo de verdade fica no env do servidor.

**Smoke test after deploy:** `/api/health` e um checkout ou login, como o guia de deploy pede.

## CI/CD

| Pipeline file | Triggers | Jobs |
| ------------- | -------- | ---- |
| `.github/workflows/ci.yml` | push e pull request em `main` e `master` | install, build do core, teste do core, build do front, lint do front, teste do front |

| Gate | Blocking | Tool |
| ---- | -------- | ---- |
| Lint | não | ESLint, `continue-on-error: true` |
| Unit tests | sim | testes do core e `vitest` do front |
| E2E | não há | — |
| Security audit | não | manual, guia `09-audit-dependencias.md` |
| Meridian | não está no CI | `validate_meridian.py` local |

## Observability (optional at init)

| Signal | Tool | Dashboard |
| ------ | ---- | --------- |
| Logs | stdout do processo Next, no servidor | quem tem acesso ao host |
| Metrics | Umami da instalação própria, se `NEXT_PUBLIC_UMAMI_SRC` e `NEXT_PUBLIC_UMAMI_WEBSITE_ID` existirem | o navegador fala com esse host |
| Errors | sem Sentry no `package.json` lido | — |

## Gaps / open questions

| # | Gap | Owner |
| - | --- | ----- |
| 1 | O compose local está no ar em `127.0.0.1:5435`. A prova de restart no VPS fica para o corte | US-0019 |
| 2 | Região do servidor e o domínio público | manager |
| 3 | O `cp` do setup assume `.env.example` no front. Confirmar o nome do arquivo se o setup falhar | quem for rodar local |

## Gate

O setup local precisa ser copiável antes de `approved`. O bloco de comandos acima é o caminho do monorepo atual.
