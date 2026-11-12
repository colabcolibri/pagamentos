---
title: Security
status: draft
version: 1.0
updated: 2026-11-12
depends_on: [00_scope.md, 01_tech_stack.md]
blocks: [03_user_types.md, 04_principles.md, 05_architecture.md]
---

# 02 — Security

> **Init:** rascunho a partir do código. **Aprofundar:** `/security-pass bootstrap` e `/privacy-pass bootstrap` (há PII) antes de `approved`.

## Security posture summary

| Attribute | Value |
| --------- | ----- |
| **Exposure** | internet pública (checkout, login, webhook, admin) |
| **Auth required** | parcial. Checkout de catálogo e webhooks têm regra própria. Perfil e admin exigem sessão |
| **Sensitive data** | PII e identificadores de pagamento. Número de cartão fica no gateway |
| **Compliance** | LGPD em elaboração. PCI do cartão delegado ao gateway. GDPR não confirmado |
| **Trust boundary** | Dentro: app Next, schema `payments`, segredos de servidor. Fora: browser, Pagar.me, Asaas, SMTP. O Postgres escuta em `127.0.0.1` |

## Data classification

| Class | Examples in this product | Storage | Retention | Encryption |
| ----- | ------------------------ | ------- | --------- | ---------- |
| Public | nome de produto, preço exibido no checkout | `payments.products`, `payments.prices` | enquanto o preço existir | em trânsito via HTTPS |
| Internal | pedido, status, id de gateway, log de webhook | `payments.orders`, tabelas de pagamento, `webhook_events` | não definido no código | em trânsito |
| Confidential | e-mail, telefone, CPF/CNPJ, endereço de cobrança | `payments.profiles` | não definido | em trânsito. Em repouso, disco do volume Docker |
| Regulated | dado pessoal de pagamento e identificação | perfil e metadados | falta política de exclusão | ver lacunas |

**PII inventory:** e-mail, nome, telefone, CPF, CNPJ, razão social, endereço de cobrança. Estão em `payments.profiles`. O código de acesso vai por e-mail e é gravado só como HMAC (`ACCESS_CODE_SECRET`) em `payments.access_codes`. A sessão guarda o hash do token, não o token.

**Data minimization:** o cartão não é coluna do schema lido. Não coletar senha de cliente enquanto o fluxo for código por e-mail.

## Privacy — LGPD (Brazil)

| Topic | This product |
| ----- | ------------ |
| Controlador / operador | Definido pelo operador da instância (`BRAND_LEGAL_NAME` / `BRAND_CNPJ`) |
| Bases legais (Art. 7 / 11) | Não documentadas. Hipótese de trabalho: execução de contrato e obrigação de registro da venda. Não é aconselhamento |
| Direitos do titular (Art. 18) — como exercer | Não há fluxo de acesso, correção ou exclusão de conta no código lido, além de editar o próprio perfil |
| Encarregado — contato | Desconhecido |
| RIPD necessário? | em elaboração. Pagamento mais identificação pede avaliação, não conclusão nesta init |
| Retenção e exclusão | Não há prazo no código. `prevent_payment_delete` limita apagar pagamento |
| Transferência internacional | Next e Postgres ficam no mesmo servidor. A região desse host não está no repo. Confirmar com o gestor |
| Incidentes — procedimento | Não documentado |

**Referências oficiais (consultar, não substituir assessoria jurídica):** checklist `privacy-compliance-checklist.md` do kit, seção LGPD.

## Privacy — GDPR (EU/EEA)

Marcado como não confirmado. Se não houver titular na União Europeia, esta seção fica N/A na aprovação.

| Topic | This product |
| ----- | ------------ |
| Controller / processor | desconhecido |
| Lawful bases (Art. 6) per purpose | não aplicável até confirmar escopo |
| Data subject rights — how to exercise | não aplicável até confirmar escopo |
| DPO — contact or N/A | desconhecido |
| DPIA required? | in progress até o manager responder |
| Retention and erasure | igual à lacuna de LGPD |
| International transfers (Ch. V) | não analisado |
| Breach notification process | não documentado |

## Authentication model

| Surface | Mechanism | Session / token | Expiry | Notes |
| ------- | --------- | --------------- | ------ | ----- |
| Web cliente | código de 6 dígitos por e-mail | cookie `httpOnly` cujo nome é `NEXT_PUBLIC_AUTH_COOKIE_NAME` (`sameSite: lax`, `secure` em produção) | 14 dias (`SESSION_TTL_MS`) | `access-code.ts`, `session-cookie.ts` |
| Web admin | mesma sessão, mais linha em `payments.admin_users` | mesma | mesma | `proxy.ts`, `api-guards.ts`. O e-mail de `ADMIN_EMAIL` vira admin no login |
| API do app | cookie de sessão no servidor (`getPool()` em `session.ts`) | `payments.sessions` | mesma | Rotas de perfil e admin |
| OAuth2 / Servidor MCP (`/api/mcp`) | código de autorização PKCE (`S256`) + consentimento com token CSRF assinado (`consent-csrf.ts`) e checagem de `Origin` | Bearer access token (1h) e refresh token rotativo (14d) com detecção de reuso (`payments.mcp_tokens`, hash SHA-256) | 1h (access) / 14d (refresh) | Apenas admin ativo (`payments.admin_users.is_active`). Revogável em Configurações |
| Webhook | segredo compartilhado, comparação em tempo constante (`timingSafeStringEqual` via SHA-256) | header do gateway, não sessão de usuário | n/a | `PAGARME_WEBHOOK_SECRET`, `ASAAS_WEBHOOK_SECRET` obrigatórios em produção |

**Password policy:** não há senha de cliente.

**MFA:** não há. O fator único é o código de e-mail. Cinco erros invalidam aquele código.

**Account recovery:** pedir outro código para o mesmo e-mail. `POST /api/auth/access-code` responde com o mesmo texto para e-mail novo e e-mail existente e não devolve `user_exists`. Pedido de código não altera nome, telefone nem documento de perfil já existente.

O código novo não verifica hash antigo. Quem pediu código antes da troca de HMAC precisa pedir outro.

## Authorization model

| Role / profile | Can | Cannot | Enforced where |
| -------------- | --- | ------ | -------------- |
| Anônimo | ver checkout público e chamar preview de cupom e catálogo | abrir admin ou perfil alheio | rotas públicas. Sem chave anônima no bundle |
| Cliente autenticado | ler e atualizar o próprio perfil e os próprios pedidos | ler pedido de outro, abrir `/api/admin/*` | sessão e filtro por dono nas rotas |
| Admin ativo | CRUD de catálogo, pedidos, pagamentos, stats, ler a trilha | o que `is_active` falso bloqueia | `requireAdmin` em `/api/admin/*` |
| Processo do servidor | escrever pedido, pagamento e perfil no checkout e no webhook | não expõe `DATABASE_URL` no browser | pool no servidor |

**Model type:** hybrid. Papel de admin na tabela, e posse da linha pelo `user_id` / `profiles.id`.

**Privileged operations:** marcar como pago, cancelar, apagar pedido ou pagamento, recalcular estoque, editar produto. Só admin. Apagar pagamento ainda passa por `payments.prevent_payment_delete`.

**Multi-tenant isolation:** não há tenant. Isolamento é por usuário dono do pedido. Um único catálogo da operação.

## Threat model (STRIDE summary)

| Surface | Threat actors | Top STRIDE threats | Mitigation (doc or code) | Residual risk |
| ------- | ------------- | ------------------ | ------------------------ | ------------- |
| Checkout e catálogo | anônimo | tampering de preço no cliente e abuso de cupom | preço recalculado no servidor em `packages/core`; cupom travado com `FOR UPDATE` e contagem restrita a pedidos válidos (não cancelados/expirados) | baixo |
| Webhook de entrada | terceiro na internet | spoofing de pagamento confirmado | segredo obrigatório em produção (`timingSafeStringEqual`) e teto de 60/min por IP | médio se o segredo vazar |
| Webhook de saída do produto e leitor de URL IA | admin | SSRF e redirect para rede interna | só `https` público (`isPublicHttpsWebhookUrl` com resolução DNS) e `redirect: 'error'` no `fetch` | baixo |
| Admin e Servidor MCP | cliente autenticado / terceiro | elevation of privilege e CSRF no consentimento OAuth | `requireAdmin` nas rotas, token CSRF HMAC + `Origin` em `/api/mcp/oauth/consent`, detecção de reuso de refresh token e políticas `read`/`upsert`/`delete` com `confirmar=true` para risco alto | baixo |
| Contato público (`/api/contact`) | visitante anônimo | abuso de envio de e-mail (open relay) e header injection | envia exclusivamente para `brand.contactEmail` (sem `cc` ao remetente), sanitiza quebras de linha no `subject` e aplica teto de 12/min por IP | baixo |
| Postgres e Contêiner | vizinho no host | exposição da porta e execução privilegiada | `deploy/postgres/compose.yml` publica `127.0.0.1:5435` (sem portas no VPS) e `deploy/app/Dockerfile` executa como `USER node` | baixo |

**Business-logic abuse:** o limite mora em `front-pagamento/proxy.ts`, reexportado por `middleware.ts`. O teto do código de acesso, por IP e por e-mail, também está nesse arquivo. Memória por instância. Some no cold start e não vale entre vários processos. `DISABLE_API_RATE_LIMIT=1` desliga o limite. Não usar isso em produção. `X-Forwarded-For` só entra na chave quando `TRUSTED_PROXY=1`.

## Secrets and configuration

| Secret type | Storage | Rotation | Never in Git |
| ----------- | ------- | -------- | ------------ |
| Chaves de gateway, IA e `ACCESS_CODE_SECRET` | env do processo no servidor, ou criptografadas com AES-256-GCM (`enc:v1:...` via `secret-box.ts` usando `SETTINGS_ENCRYPTION_KEY` / `ACCESS_CODE_SECRET`) em `payments.platform_settings` e `payments.products.webhook_secret` | manual pelo admin ou env | sim |
| `PAGARME_SECRET_KEY`, segredos de webhook | env (prioritário) ou `payments.platform_settings` criptografado; respostas de API Admin e MCP devolvem apenas máscara (`maskSecret`) | manual | sim |
| `ACCESS_CODE_SECRET` | env do servidor | não documentada | sim |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET` | env | não documentada | sim |
| SMTP | env | não documentada | sim |
| Credencial do Postgres alvo | env do servidor, quando existir | não documentada | sim |

- `.env`, `.env.*` e `.meridian/meridian.db` estão no `.gitignore`. Exceção: `!.env.example`.
- Exemplo de chaves: `front-pagamento/.env.example` (citado no guia de deploy). Não copiar valor real.
- **Secrets manager:** arquivo de env no servidor, fora do git. Não há Vault no repo. Não há painel de hosting como fonte.

Não há chave anônima de plataforma no bundle de produção. `DATABASE_URL` e `ACCESS_CODE_SECRET` não podem ser `NEXT_PUBLIC_`. `TRUSTED_PROXY=1` só quando um proxy reescreve `X-Forwarded-For`. Sem isso, o rate limit ignora o header.

## Input validation and output encoding

| Boundary | Validation approach | Library (zod, pydantic, …) | Encoding notes |
| -------- | ------------------- | ---------------------------- | -------------- |
| HTTP API | validadores no core e no front | há testes `checkout-body.validators`. Zod está no guia de desenvolvimento. Confirmar import no `/security-pass` | JSON |
| Forms / UI | máscara e validação de checkout | `@brazilian-utils/brazilian-utils`, componentes em `src/components/checkout/` | texto |
| File upload | não há upload de arquivo de cliente no inventário | — | — |
| Webhooks | segredo do gateway | env de produção falha o start se faltar | corpo JSON do provedor |

**Injection:** o acesso ao banco é SQL parametrizado pelo `pg`. Não há cliente PostgREST nem chave anônima no bundle. Funções SQL usam `search_path` fixo nas migrações de hardening.

**Path traversal:** sem filesystem de usuário no fluxo lido.

## Data protection

- **In transit:** HTTPS termina no nginx do servidor. O Next escuta HTTP só na rede interna. Local é HTTP em `localhost`. Gateways seguem em HTTPS.
- **At rest:** disco do volume Docker. Criptografia de disco do provedor não está comprovada no repo.
- **Logs:** pedido de código e falha de envio não gravam o e-mail. `updateOwnProfile` não escreve no logger. A trilha de admin não leva PII do comprador.
- **Backups:** `deploy/postgres/backup.sh` gera o dump no servidor. Não há backup de plataforma de terceiros no fluxo.

## Rate limiting and abuse

| Endpoint / action | Limit | Response | Notes |
| ----------------- | ----- | -------- | ----- |
| POST checkout | 30/min por IP | 429 `RATE_LIMITED` | `proxy.ts`. Memória |
| `/api/admin/*` e `/api/mcp` | 240/min por IP | 429 | mesmo arquivo (com remoção automática de entradas expiradas em `api-rate-limit.ts`) |
| `POST /api/mcp/oauth/register` | 10/min por IP | 429 | balde dedicado `mcp-oauth-register` |
| `POST /api/mcp/oauth/token` | 30/min por IP | 429 | balde dedicado `mcp-oauth-token` |
| POST contato | 12/min por IP | 429 | mesmo arquivo |
| POST preview de cupom | 90/min por IP | 429 | mesmo arquivo |
| GET catálogo, CEP e status | 400/min por IP | 429 | mesmo balde |
| POST webhook Pagar.me e Asaas | 60/min por IP, baldes separados | 429 | antes do handler |
| POST pedir código e verificar | 10/min por IP; 5 pedidos ou 10 verificações por e-mail em 10 min | 429 | os dois tetos estão no proxy, via `authAttemptAllowed`. Sem `TRUSTED_PROXY`, a chave é o IP da conexão |
| API global | não há um teto único além desses baldes | — | — |

## Audit and logging

| Event | Logged fields | Retention | Who can read |
| ----- | ------------- | --------- | ------------ |
| Auth success/fail | sem tabela de tentativa. O código erra no máximo 5 vezes | a linha de `access_codes` fica no banco | operador do Postgres |
| Webhook | `payments.webhook_events` | não definida | admin na tela de webhooks |
| E-mail | `payments.email_logs` | não definida | admin |
| Admin: marcar pago, cancelar pedido, cancelar pagamento, apagar pedido | `payments.admin_audit_events` (ator, ação, alvo, horário) | não definida | admin em `/admin/audit` |

## Dependencies and supply chain

| Concern | Policy |
| ------- | ------ |
| Lockfiles committed | pnpm. CI usa `pnpm install --frozen-lockfile` |
| Audit command | `pnpm audit --audit-level=high --prod` adicionado ao workflow `.github/workflows/ci.yml` |
| CI gate | teste, build e `pnpm --filter @quitou/admin lint` bloqueiam o pipeline |
| Copyleft / license review | licença MIT no `package.json` da raiz. Não há revisão de licença de dependência no CI |

Override já presente: `fast-xml-parser` `>=5.3.5` no `package.json` da raiz.

## AI and automation safety (Meridian / agents)

| Rule | Detail |
| ---- | ------ |
| Write scope | código do produto só com história `ready` e `/implement-us`. Nesta init, só `docs/` e `.gitignore` |
| Forbidden | segredo em prompt, `git push --force`, reset de banco, apagar volume do Postgres |
| Human gates | `approved` nos docs, `ready` na história, commit |
| HAR | chave de gateway, SMTP, senha do Postgres, deploy no VPS |
| Extension / IDE | kit local em `.agent/` |

## OWASP and common risks

| Risk area | Posture for this product | Follow-up US / doc |
| --------- | ------------------------ | ------------------ |
| Broken access control | guard de admin e posse do pagamento na rota | manter nas rotas novas |
| Cryptographic failures | HMAC do código e hash do token de sessão | rotacionar `ACCESS_CODE_SECRET` invalida códigos em aberto |
| Injection | SQL das rotas novas é parametrizado | continuar assim |
| Insecure design | o browser chama a API. Não há chave de banco no cliente | não reintroduzir `NEXT_PUBLIC_` de segredo |
| Security misconfiguration | porta do banco em localhost. `TRUSTED_PROXY` explícito | ligar a env só atrás de proxy que reescreve o header |
| Vulnerable components | override de `fast-xml-parser`. Lint não bloqueia CI | `/dependency-audit` |
| Auth failures | código por e-mail. Sem MFA | aceito até o gestor decidir o contrário |
| Data integrity | dedup de webhook e trava de delete | manter |
| Logging failures | e-mail fora do log de auth | não voltar a passar e-mail para o logger |
| SSRF | URL de produto só HTTPS público, no save e no disparo | não aceitar `http` nem IP privado |

## Gaps / open questions

| # | Gap | Severity | Owner | Target |
| - | --- | -------- | ----- | ------ |
| 1 | Controlador, encarregado e base legal não estão no repo. Este texto não inventa os nomes | high | manager | aprovação de `02` |
| 2 | Escopo GDPR desconhecido | medium | manager | aprovação de `02` |
| 3 | Retenção de perfil, webhook, e-mail e trilha de admin | medium | manager | `06_database` |
| 4 | Rate limit em memória não é compartilhado entre instâncias e zera no cold start | medium | implementação | história futura, se o host tiver mais de um processo |
| 5 | Sem MFA | low | manager | registrar na aprovação se continuar aceito |
| 6 | Auditoria de dependência não é gate do CI. Lint do front segue `continue-on-error` | medium | `/dependency-audit` | antes de tratar a cadeia como fechada |

## Gate

Humano define `status: approved`. Lacuna crítica ou é fechada ou é aceita no log de decisão.
