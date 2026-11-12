# Relatório Crítico de Segurança — Quitou

> **Data da auditoria:** 2026-11-12  
> **Agente responsável:** `@security-champion` (Meridian Protocol)  
> **Escopo auditado:** `front-pagamento/` (Next.js 16 App Router, Auth, Admin, OAuth/MCP Server), `packages/core/` (`@quitou/core` — checkouts Asaas/Pagar.me, catálogo, cupons, webhooks), `front-pagamento/db/migrations/` (PostgreSQL), `deploy/` (Docker/VPS) e `.github/workflows/ci.yml`.  
> **Referência normativa:** [`docs/02_security.md`](./02_security.md)  
> **Status da remediação:** ✅ **15/15 itens resolvidos** na `US-0046` (ver seção de status ou [`docs/02_security.md`](./02_security.md)).

---

## Sumário Executivo

A arquitetura base do Quitou evoluiu bem na migração do Supabase para PostgreSQL próprio: não há *SQL Injection*, o cálculo financeiro do checkout acontece exclusivamente no servidor, os webhooks possuem deduplicação transacional (`payments.webhook_events`) e o fluxo de login por código (OTP) usa boas primitivas criptográficas (HMAC-SHA256 + `timingSafeEqual`).

Porém, **as funcionalidades adicionadas recentemente — em especial o servidor OAuth/MCP administrativo (`/api/mcp/*`), a central de chaves no banco (`payments.platform_settings`), a geração de produtos com IA e o formulário de contato — introduziram falhas de severidade Alta** que precisam ser corrigidas antes de escalar o tráfego em produção. Além disso, um erro de gerenciamento de conexão em `session.ts` permite derrubar o banco de dados com poucas requisições simultâneas.

| Severidade | Quantidade | Resumo dos itens |
| :--- | :---: | :--- |
| 🔴 **ALTO** | **4** | (1) Falta de CSRF no consentimento OAuth MCP + registro aberto de clientes; (2) Segredos de gateways/webhooks em texto puro no banco, API admin e logs; (3) Abuso de envio de e-mail (`cc` aberto) em `/api/contact`; (4) Exaustão de conexões PostgreSQL (`new Client()` por request em `session.ts`). |
| 🟠 **MÉDIO** | **6** | (5) SSRF na geração de produto com IA; (6) Bypass por redirect/DNS rebinding no webhook outbound de produto; (7) Race condition e exaustão sem pagamento em cupons/promoções; (8) Rate limit em memória sem expiração e sem cobertura no OAuth; (9) CSP com `'unsafe-inline'`/`'unsafe-eval'`; (10) Vazamento de PII (CPF/CNPJ/e-mail) em logs. |
| 🟡 **BAIXO** | **5** | (11) Contêiner Docker rodando como `root`; (12) Lint não bloqueante e ausência de `pnpm audit` no CI; (13) Ausência de rotina de expurgo (TTL) no banco e lacunas LGPD em `02_security.md`; (14) Exposição de `error.message` em produção no checkout Pagar.me; (15) Comparação de segredo no webhook Asaas vazando comprimento por timing. |

---

## 🔴 1. Achados de Severidade ALTA (O que realmente precisa mudar agora)

### 1.1. Superfície OAuth2 / MCP sem proteção CSRF no Consentimento e com Registro Dinâmico Público
- **Onde:**
  - [`front-pagamento/src/app/api/mcp/oauth/consent/route.ts`](../front-pagamento/src/app/api/mcp/oauth/consent/route.ts#L11-L78)
  - [`front-pagamento/src/app/admin/mcp/consent/page.tsx`](../front-pagamento/src/app/admin/mcp/consent/page.tsx#L91-L119)
  - [`front-pagamento/src/app/api/mcp/oauth/register/route.ts`](../front-pagamento/src/app/api/mcp/oauth/register/route.ts#L12-L54)
  - [`front-pagamento/src/lib/mcp/auth/redirect-uri.ts`](../front-pagamento/src/lib/mcp/auth/redirect-uri.ts#L8-L31)
  - [`front-pagamento/src/lib/mcp/auth/oauth-store.ts`](../front-pagamento/src/lib/mcp/auth/oauth-store.ts#L109-L124)
- **Por que é crítico:**
  1. **Registro aberto de qualquer `redirect_uri` HTTPS:** `POST /api/mcp/oauth/register` é público (sem autenticação e sem rate limit dedicado) e `validateRedirectUris` aceita qualquer URL com `protocol === 'https:'`. Qualquer terceiro pode registrar um `client_id` apontando para um domínio externo.
  2. **Ausência de CSRF token e validação de `Origin` em `POST /api/mcp/oauth/consent`:** O endpoint recebe `application/x-www-form-urlencoded` (`request.formData()`), lê o cookie `quitou_token` do admin e emite imediatamente um `authorization_code` para o `redirect_uri` informado no form, sem validar token CSRF nem cabeçalho `Origin`/`Referer`. Embora o cookie use `sameSite: 'lax'`, não há *binding* criptográfico entre a renderização de `/admin/mcp/consent` e o `POST`, nem restrição se `NEXT_PUBLIC_COOKIE_DOMAIN` abranger subdomínios.
  3. **Rotação de Refresh Token sem detecção de reuso:** Em `rotateRefresh` ([`oauth-store.ts`](../front-pagamento/src/lib/mcp/auth/oauth-store.ts#L109-L124)), se um refresh token já revogado for reapresentado, o sistema apenas retorna `null` em vez de revogar os tokens ativos emitidos para aquele `client_id`/`user_id`.
  4. **Ponto cego documental:** O servidor MCP inteiro (26 ferramentas administrativas capazes de marcar pedidos como pagos, cancelar cobranças, criar/editar produtos e alterar configurações de gateway) **não está documentado em [`docs/02_security.md`](./02_security.md)**.
- **O que mudar:**
  - Validar estritamente o header `Origin` contra a origem canônica do app e incluir um token CSRF assinado (HMAC vinculado ao `session.id`, `client_id`, `code_challenge` e `redirect_uri`) no formulário de `/admin/mcp/consent`.
  - Restringir os `redirect_uri` permitidos no registro OAuth a uma allowlist de domínios confiáveis (ou exigir aprovação/registro prévio por admin).
  - Atualizar [`docs/02_security.md`](./02_security.md) incluindo o modelo de ameaças do OAuth2 + MCP.

---

### 1.2. Segredos de Gateways, IA e Webhooks em Texto Puro no Banco, Expostos em APIs Admin e Vazados em Logs
- **Onde:**
  - [`front-pagamento/db/migrations/20261110140718_gateway_settings.sql`](../front-pagamento/db/migrations/20261110140718_gateway_settings.sql#L10-L23)
  - [`front-pagamento/db/migrations/20261111164836_integration_keys.sql`](../front-pagamento/db/migrations/20261111164836_integration_keys.sql#L5-L10)
  - [`front-pagamento/src/lib/payments/catalog/postgres-catalog.ts`](../front-pagamento/src/lib/payments/catalog/postgres-catalog.ts#L229-L263)
  - [`front-pagamento/src/lib/payments/product/product.service.ts`](../front-pagamento/src/lib/payments/product/product.service.ts#L106-L107) e [linhas 151, 178, 234](../front-pagamento/src/lib/payments/product/product.service.ts#L178-L234)
  - [`front-pagamento/src/app/api/admin/products/route.ts`](../front-pagamento/src/app/api/admin/products/route.ts#L59-L83)
- **Por que é crítico:**
  1. **Texto puro em `payments.platform_settings` e `payments.products`:** Chaves críticas de produção (`asaas_api_key`, `asaas_webhook_secret`, `pagarme_secret_key`, `pagarme_webhook_secret`, `gemini_api_key`, `deepinfra_api_key`, `products_by_price_api_key` e `products.webhook_secret`) são salvas em colunas `text` sem criptografia em repouso (AES-256-GCM com chave mestre do ambiente). Qualquer backup SQL, dump ou leitura indevida do banco compromete todos os provedores financeiros.
  2. **Vazamento de `webhook_secret` na API Admin:** `getAllProducts(true)` e `getProductById(id, true)` em [`postgres-catalog.ts`](../front-pagamento/src/lib/payments/catalog/postgres-catalog.ts#L233) selecionam `webhook_secret` completo e as rotas `GET /api/admin/products` e `GET /api/admin/products/[id]` o devolvem em texto aberto no JSON para o navegador (enquanto no MCP houve o cuidado de mascarar com `maskSecret`).
  3. **Vazamento de `webhook_secret` nos logs de aplicação:** Em [`product.service.ts`](../front-pagamento/src/lib/payments/product/product.service.ts#L106), `this.logger.info('Criando produto', { data, userId })` e `this.logger.info('Atualizando produto', { id, data, userId })` serializam o objeto `data` inteiro — incluindo `webhook_secret` em texto puro — diretamente no `stdout`.
- **O que mudar:**
  - Remover imediatamente `webhook_secret` dos logs de `ProductService` (ou filtrar campos sensíveis no logger).
  - Não retornar `webhook_secret` em texto puro em `GET /api/admin/products` e `GET /api/admin/products/[id]` (retornar apenas booleano `has_webhook_secret` e máscara parcial, como já é feito em `/api/admin/settings/gateway`).
  - Criptografar colunas de segredos em `payments.platform_settings` e `payments.products.webhook_secret` na camada de aplicação (ex.: AES-256-GCM usando uma `MASTER_ENCRYPTION_KEY` exclusiva de variável de ambiente).

---

### 1.3. Abuso de E-mail Público (Envio para Terceiros via `cc`) em `POST /api/contact`
- **Onde:**
  - [`front-pagamento/src/app/api/contact/route.ts`](../front-pagamento/src/app/api/contact/route.ts#L56-L65)
- **Por que é crítico:**
  - A rota pública `/api/contact` monta o e-mail com:
    ```ts
    to: brand.contactEmail,
    cc: email,
    replyTo: email,
    subject: `[Fale conosco] Mensagem de ${name}`,
    ```
  - Como `email`, `name` e `message` vêm diretamente do visitante não autenticado, colocar `cc: email` faz com que o servidor SMTP da plataforma envie uma cópia completa da mensagem livre (`message`) para **qualquer endereço de e-mail da internet** informado no campo `email`, assinado legitimamente pelo domínio do Quitou (SPF/DKIM válidos).
  - Isso permite que terceiros usem o domínio do Quitou para disparar spam ou phishing contra vítimas arbitrárias, podendo colocar o domínio e o IP de envio em blocklists e derrubar a entrega dos códigos de login (OTP).
- **O que mudar:**
  - **Remover `cc: email`** de [`front-pagamento/src/app/api/contact/route.ts`](../front-pagamento/src/app/api/contact/route.ts#L59), mantendo apenas `to: brand.contactEmail` e `replyTo: email`.
  - Sanitizar quebras de linha (`\r`, `\n`) em `name` antes de interpolá-lo em `subject`.

---

### 1.4. Exaustão de Conexões PostgreSQL na Autenticação (`new Client()` por Requisição)
- **Onde:**
  - [`front-pagamento/src/lib/auth/session.ts`](../front-pagamento/src/lib/auth/session.ts#L18-L65)
  - [`deploy/postgres/compose.yml`](../deploy/postgres/compose.yml#L11)
- **Por que é crítico:**
  - Tanto `findActiveSession` quanto `revokeSession` instanciam um `new Client({ connectionString })`, abrem uma conexão TCP/TLS nova com `await client.connect()` e a fecham com `await client.end()` a **cada requisição autenticada** (páginas SSR, rotas `/api/profile/*`, `/api/admin/*`, `/api/payments/*`).
  - No [`deploy/postgres/compose.yml`](../deploy/postgres/compose.yml#L11), o PostgreSQL roda com `max_connections=30`, e o pool compartilhado ([`front-pagamento/src/lib/db/pool.ts`](../front-pagamento/src/lib/db/pool.ts#L18)) já reserva até 10 conexões.
  - Basta um pico de ~20 requisições simultâneas com cookie `quitou_token` (mesmo com token inválido, pois a query roda antes de saber se a sessão existe) para esgotar `max_connections=30` (`FATAL: sorry, too many clients already`), causando **Negação de Serviço (DoS)** em todo o checkout, webhooks e login.
- **O que mudar:**
  - Substituir `new Client()` em [`front-pagamento/src/lib/auth/session.ts`](../front-pagamento/src/lib/auth/session.ts#L18-L65) pelo pool compartilhado `getPool()` de [`front-pagamento/src/lib/db/pool.ts`](../front-pagamento/src/lib/db/pool.ts).

---

## 🟠 2. Achados de Severidade MÉDIA

### 2.1. SSRF e Falta de Validação de URL na Geração de Produto com IA (`POST /api/admin/products/generate`)
- **Onde:**
  - [`front-pagamento/src/app/api/admin/products/generate/route.ts`](../front-pagamento/src/app/api/admin/products/generate/route.ts#L65-L75)
  - [`front-pagamento/src/lib/security/safe-fetch-url.ts`](../front-pagamento/src/lib/security/safe-fetch-url.ts#L14-L53)
- **Problema:**
  - Diferente de `edit-with-ai/route.ts` e da tool MCP `catalog.ts`, a rota `POST /api/admin/products/generate` **não chama `isUrlSafeForServerSideFetch(url)`** antes de interpolar `https://r.jina.ai/${url}`.
  - Além disso, `isUrlSafeForServerSideFetch` em [`safe-fetch-url.ts`](../front-pagamento/src/lib/security/safe-fetch-url.ts) faz apenas validação sintática da string (não resolve DNS como `isPublicHttpsWebhookUrl` faz no `@quitou/core` e aceita `http:`).
- **Recomendação:**
  - Validar `url` com resolução de DNS (`isPublicHttpsWebhookUrl` ou equivalente), exigir `https:` e usar `encodeURIComponent` / normalização estrita ao consultar `r.jina.ai`, com `redirect: 'error'`.

### 2.2. Bypass de Validação SSRF via Redirect HTTP / DNS Rebinding no Webhook Outbound de Produto
- **Onde:**
  - [`packages/core/src/webhooks/payment-confirmed-product-webhook.ts`](../packages/core/src/webhooks/payment-confirmed-product-webhook.ts#L186-L195)
  - [`packages/core/src/webhooks/public-webhook-url.ts`](../packages/core/src/webhooks/public-webhook-url.ts#L22-L67)
- **Problema:**
  - `isPublicHttpsWebhookUrl` resolve o DNS e garante que o destino inicial é HTTPS e possui IP público. Contudo, o `fetch(webhookUrl, ...)` na linha 186 usa o comportamento padrão `redirect: 'follow'`.
  - Se o endpoint externo responder com um `301`/`302` redirecionando para `http://127.0.0.1:5432`, `http://postgres:5432` ou `http://169.254.169.254/`, o Node.js seguirá o redirecionamento sem reexecutar `isPublicHttpsWebhookUrl`, contornando a proteção contra SSRF. Há também uma janela TOCTOU entre o `lookup` da validação e o `lookup` interno do `fetch`.
- **Recomendação:**
  - Definir explicitamente `redirect: 'error'` no `fetch` de [`payment-confirmed-product-webhook.ts`](../packages/core/src/webhooks/payment-confirmed-product-webhook.ts#L186).

### 2.3. Condição de Corrida (Race Condition) e Exaustão de Cupons sem Pagamento
- **Onde:**
  - [`packages/core/src/payments/checkout/checkout-store.ts`](../packages/core/src/payments/checkout/checkout-store.ts#L168-L214)
  - [`packages/core/src/routes/pagarme-checkout.ts`](../packages/core/src/routes/pagarme-checkout.ts#L390-L413)
  - [`packages/core/src/routes/asaas-checkout-avista.ts`](../packages/core/src/routes/asaas-checkout-avista.ts#L421-L443)
- **Problema:**
  1. **TOCTOU no limite de uso:** `loadCheckoutCoupon` consulta `SELECT count(*) FROM payments.coupon_redemptions` antes da chamada HTTP externa ao gateway (Asaas/Pagar.me) e só insere em `coupon_redemptions` depois que o gateway responde. Requisições concorrentes passam juntas pela checagem de `max_redemptions_total` e `max_redemptions_per_user`.
  2. **Exaustão gratuita de cupom (DoS de negócio):** O cupom é contabilizado em `coupon_redemptions` no momento em que o checkout `pending` é criado (antes de o cliente pagar). Um usuário mal-intencionado pode gerar N checkouts sem pagar e esgotar um cupom promocional de uso limitado.
- **Recomendação:**
  - Usar transação com `SELECT ... FOR UPDATE` na linha de `payments.coupons` ao reservar/inserir em `coupon_redemptions` e ignorar/expirar redemptions associadas a pagamentos `cancelled`/`failed` ou `pending` expirados.

### 2.4. Rate Limiting Exclusivamente em Memória (Sem Eviction) e Lacunas nas Rotas OAuth
- **Onde:**
  - [`front-pagamento/src/lib/security/api-rate-limit.ts`](../front-pagamento/src/lib/security/api-rate-limit.ts#L14-L53)
  - [`front-pagamento/src/proxy.ts`](../front-pagamento/src/proxy.ts#L50-L92)
- **Problema:**
  - O `Map` em [`api-rate-limit.ts`](../front-pagamento/src/lib/security/api-rate-limit.ts#L14) nunca remove entradas expiradas (`resetAt <= now` só sobrescreve se a mesma chave voltar a ser consultada). Um ataque distribuído com chaves variáveis (ex.: e-mails aleatórios em `/api/auth/access-code` ou IPs falsificados se o proxy não sobrescrever cabeçalhos) causa crescimento contínuo de memória no processo Node.js.
  - Além disso, `/api/mcp/oauth/register` e `/api/mcp/oauth/token` caem apenas no limite genérico de `/api/mcp` (`240 req/min` por IP), permitindo criar centenas de clientes no banco (`payments.mcp_clients`) por minuto.
- **Recomendação:**
  - Adicionar limpeza periódica (TTL sweep / limite máximo de chaves no `Map`) e criar buckets restritos para `/api/mcp/oauth/register` (ex.: 10/min por IP) e `/api/mcp/oauth/token` (ex.: 30/min por IP).

### 2.5. Content Security Policy (CSP) com `'unsafe-inline'` e `'unsafe-eval'` em Produção
- **Onde:**
  - [`front-pagamento/next.config.ts`](../front-pagamento/next.config.ts#L15-L27)
- **Problema:**
  - A diretiva `script-src 'self' 'unsafe-inline' 'unsafe-eval'` está ativa inclusive em produção, neutralizando a proteção da CSP contra execução de scripts caso ocorra injeção de marcação no front-end.
- **Recomendação:**
  - Remover `'unsafe-eval'` em produção (`process.env.NODE_ENV === 'production'`) e planejar migração gradual para CSP baseada em `nonce` no proxy do Next.js.

### 2.6. Registro de PII (CPF/CNPJ e E-mail) nos Logs de Aplicação
- **Onde:**
  - [`packages/core/src/routes/asaas-checkout-parcelado.ts`](../packages/core/src/routes/asaas-checkout-parcelado.ts#L314-L322) (`cpfCnpj`, `customerName`)
  - [`packages/core/src/routes/pagarme-checkout.ts`](../packages/core/src/routes/pagarme-checkout.ts#L118-L134) (`userEmail`, `customerEmail`)
  - [`front-pagamento/src/lib/email-helpers.ts`](../front-pagamento/src/lib/email-helpers.ts#L206) e [linha 449](../front-pagamento/src/lib/email-helpers.ts#L449) (`email: user.email`)
- **Problema:**
  - Viola diretamente a regra declarada em [`docs/02_security.md`](./02_security.md#L73-L79) (*"Logs de aplicação não registram código em claro nem o e-mail completo"* / minimização de PII/LGPD), gravando CPF/CNPJ e e-mails completos no `stdout`.
- **Recomendação:**
  - Mascarar `cpfCnpj` e `email` nos logs operacionais ou registrar apenas `userId` e `paymentId`.

---

## 🟡 3. Achados de Severidade BAIXA (Hardening e Governança)

### 3.1. Processo da Aplicação Executando como `root` no Contêiner Docker
- **Onde:** [`deploy/app/Dockerfile`](../deploy/app/Dockerfile#L36-L56)
- **Problema:** O estágio final (`FROM node:22-bookworm-slim AS runner`) não define `USER node`, fazendo com que o servidor Next.js rode com UID 0 (`root`) dentro do contêiner.
- **Recomendação:** Ajustar permissões da pasta `/app` e adicionar `USER node` antes do `CMD`.

### 3.2. Lint Não Bloqueante (`continue-on-error: true`) e Falta de `pnpm audit` no CI
- **Onde:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml#L43-L46)
- **Problema:** O passo `Lint front-pagamento` possui `continue-on-error: true`, permitindo que falhas estáticas passem despercebidas no PR, e o workflow não executa auditoria automatizada de vulnerabilidades de dependências (`pnpm audit`).
- **Recomendação:** Remover `continue-on-error: true` após zerar warnings bloqueantes e adicionar step de auditoria de dependências no CI.

### 3.3. Ausência de Expurgo (TTL) de Tabelas de Autenticação/Eventos e Lacunas LGPD em `02_security.md`
- **Onde:**
  - [`front-pagamento/db/migrations/20260405120000_auth_custom.sql`](../front-pagamento/db/migrations/20260405120000_auth_custom.sql)
  - [`front-pagamento/db/migrations/20261112120000_mcp_oauth_and_audit.sql`](../front-pagamento/db/migrations/20261112120000_mcp_oauth_and_audit.sql)
  - [`docs/02_security.md`](./02_security.md#L121-L163)
- **Problema:** Registros expirados/usados em `payments.access_codes`, `payments.sessions`, `payments.mcp_auth_codes`, `payments.mcp_tokens` e `payments.webhook_events` nunca são removidos do banco. Além disso, a seção LGPD em `docs/02_security.md` ainda contém pendências formais em aberto (identificação do Controlador, canal do DPO/Encarregado e prazos de retenção).
- **Recomendação:** Criar rotina periódica de limpeza de tokens/códigos expirados e executar `/privacy-pass` para fechar as definições de LGPD em `docs/02_security.md`.

### 3.4. Exposição de `error.message` Bruto em Produção no Checkout Pagar.me
- **Onde:** [`packages/core/src/routes/pagarme-checkout.ts`](../packages/core/src/routes/pagarme-checkout.ts#L436-L441)
- **Problema:** O bloco `catch` final devolve `error instanceof Error ? error.message : 'Erro interno do servidor'` com HTTP 500 diretamente ao cliente, mesmo quando `NODE_ENV === 'production'`, podendo expor mensagens internas do banco ou do gateway.
- **Recomendação:** Retornar mensagem genérica (`'Erro interno ao processar pagamento'`) em produção, mantendo o detalhe apenas no log interno (como já é feito em `pagarme-webhook.ts`).

### 3.5. Comparação de Segredo no Webhook Asaas Vazando Comprimento por Timing
- **Onde:** [`front-pagamento/src/app/api/payments/asaas/webhook/route.ts`](../front-pagamento/src/app/api/payments/asaas/webhook/route.ts#L27-L32)
- **Problema:** A função `safeCompare` faz `if (a.length !== b.length) return false;` antes de `timingSafeEqual`, permitindo inferir o tamanho exato de `asaasWebhookSecret` por análise de tempo, enquanto o webhook do Pagar.me já utiliza `timingSafeStringEqual` de [`packages/core/src/security/constant-time.ts`](../packages/core/src/security/constant-time.ts#L9-L13) (que aplica SHA-256 nos dois lados antes de comparar).
- **Recomendação:** Substituir `safeCompare` local por `timingSafeStringEqual` do pacote `@quitou/core`.

---

## ✅ 4. O que está BOM (Pontos Fortes da Arquitetura Atual)

1. **Zero SQL Injection e Isolamento Estrito da Camada de Dados:**
   - Todas as consultas em `front-pagamento` e `@quitou/core` utilizam parâmetros posicionais (`$1, $2`) do driver `pg`.
   - Onde há construção dinâmica de identificadores (como em [`payments-query.ts`](../front-pagamento/src/lib/db/payments-query.ts#L5) e [`checkout-store.ts`](../packages/core/src/payments/checkout/checkout-store.ts#L5)), o código valida estritamente cada nome contra `IDENTIFIER = /^[a-z_][a-z0-9_]*$/`.
   - O SDK legado do Supabase foi completamente removido do cliente e há teste automatizado garantindo que não retorne ([`no-supabase-sdk.test.ts`](../front-pagamento/src/lib/security/no-supabase-sdk.test.ts)).

2. **Isolamento de Rede do PostgreSQL em Produção:**
   - Em [`deploy/postgres/compose.yml`](../deploy/postgres/compose.yml#L34), a porta local faz bind apenas em loopback (`127.0.0.1:5435:5432`), e o override de produção ([`deploy/postgres/compose.vps.yml`](../deploy/postgres/compose.vps.yml#L12)) zera completamente a exposição de portas no host (`ports: !reset []`), mantendo o banco acessível somente via rede interna Docker (`quitou-db`).

3. **Criptografia e Fluxo de Autenticação Passwordless (OTP) Bem Construídos:**
   - Códigos de 6 dígitos gerados com CSPRNG (`crypto.randomInt` em [`crypto-auth.ts`](../front-pagamento/src/lib/auth/crypto-auth.ts#L8-L11)), persistidos exclusivamente como HMAC-SHA256 com `ACCESS_CODE_SECRET` e comparados com `timingSafeEqual`.
   - Limite de 5 tentativas por código, expiração curta (10 minutos) e invalidação imediata de códigos anteriores ao solicitar um novo ([`verify-code/route.ts`](../front-pagamento/src/app/api/auth/verify-code/route.ts#L58-L96)).
   - Proteção contra enumeração de contas no login (`LOGIN_CODE_NOTICE` idêntico para e-mails existentes ou não em [`access-code/route.ts`](../front-pagamento/src/app/api/auth/access-code/route.ts#L45-L62)).
   - Sessão opaca de 256 bits (`randomBytes(32)`), gravada como hash SHA-256 no banco (`payments.sessions.token_hash`) e entregue em cookie `httpOnly`, `sameSite: 'lax'` e `secure` em produção.

4. **Integridade Financeira no Checkout e Prevenção de IDOR:**
   - O backend recalcula preços, descontos à vista, faixas promocionais (`product_promotions`) e adicionais (`product_addons`) diretamente a partir do banco de dados no `@quitou/core`, ignorando qualquer valor monetário enviado pelo front-end.
   - Todas as rotas de consulta de cliente (`/api/profile`, `/api/profile/orders`, `/api/payments/[id]/status`, `/api/payments/[id]/confirmation`) exigem sessão válida e filtram por `user_id = session.user.id`, impedindo acesso horizontal a pedidos ou dados de outros compradores (IDOR).

5. **Idempotência Transacional e Sanitização em Webhooks de Pagamento:**
   - As rotas de webhook Asaas e Pagar.me registram cada evento em `payments.webhook_events` via `INSERT ... ON CONFLICT (provider, provider_event_id) DO NOTHING` dentro da mesma transação que atualiza o pagamento (`WHERE status = 'pending'`), eliminando condições de corrida em reentregas simultâneas do gateway ([`webhook-events.ts`](../packages/core/src/webhooks/webhook-events.ts#L19-L66)).
   - Cabeçalhos sensíveis (`authorization`, `asaas-access-token`, `cookie`, `x-api-key`) são removidos por `sanitizeHeaders` antes de salvar o payload para auditoria.

6. **Defesas em Profundidade no Banco, Front-end e MCP:**
   - Trigger `payments.prevent_payment_delete` no PostgreSQL impede deleção de registros financeiros não cancelados; funções `SECURITY DEFINER` fixam `SET search_path = payments`.
   - Sanitização de HTML de políticas de reembolso com `DOMPurify` ([`sanitize-html.ts`](../front-pagamento/src/lib/security/sanitize-html.ts)) e renderização de prévias de e-mail no admin isolada em `<iframe sandbox="">` sem permissão de scripts ([`email-logs-table.tsx`](../front-pagamento/src/components/admin/email-logs-table.tsx#L195-L201)).
   - Prevenção de *Open Redirect* no retorno do login via [`safeMcpReturnPath`](../front-pagamento/src/lib/auth/safe-return-path.ts).
   - Governança de ferramentas MCP ([`execute-tool.ts`](../front-pagamento/src/lib/mcp/execute-tool.ts)) com controle granular por política (`read`/`upsert`/`delete`), bloqueio de ações destrutivas por padrão, exigência de `confirmar=true` para operações de alto risco e trilha de auditoria em `payments.admin_audit_events`.

---

## 🛠️ 5. Plano de Ação Recomendado (Ordem de Prioridade)

| Prioridade | Ação | Arquivos-Alvo | Fluxo Meridian Sugerido |
| :---: | :--- | :--- | :--- |
| **P0 (Imediato)** | Trocar `new Client()` por `getPool()` na validação/revogação de sessão para eliminar risco de DoS no PostgreSQL. | `front-pagamento/src/lib/auth/session.ts` | Criar/refinar US de correção → `/implement-us` |
| **P0 (Imediato)** | Remover `cc: email` da rota `/api/contact` e sanitizar `name` no `subject`. | `front-pagamento/src/app/api/contact/route.ts` | Criar/refinar US de correção → `/implement-us` |
| **P0 (Imediato)** | Parar de retornar `webhook_secret` em claro no `GET /api/admin/products*` e remover `data` bruto com `webhook_secret` dos logs de `ProductService`. | `postgres-catalog.ts`, `product.service.ts` | Criar/refinar US de correção → `/implement-us` |
| **P1 (Curto Prazo)** | Adicionar token CSRF + checagem de `Origin` em `POST /api/mcp/oauth/consent`, restringir `redirect_uri` no registro OAuth e atualizar `docs/02_security.md`. | `oauth/consent/route.ts`, `redirect-uri.ts`, `docs/02_security.md` | `/security-pass` em `02_security.md` + US → `/implement-us` |
| **P1 (Curto Prazo)** | Implementar criptografia em repouso (AES-256-GCM) para segredos em `payments.platform_settings` e `payments.products.webhook_secret`. | `platform-settings.ts`, `postgres-catalog.ts` | `/security-pass` + US → `/implement-us` |
| **P2 (Médio Prazo)** | Corrigir SSRF em `/api/admin/products/generate`, forçar `redirect: 'error'` no webhook outbound de produto e aplicar `FOR UPDATE` na reserva de cupons. | `products/generate/route.ts`, `payment-confirmed-product-webhook.ts`, `checkout-store.ts` | US de hardening → `/implement-us` |
| **P3 (Contínuo)** | Mascarar PII nos logs, adicionar `USER node` no `Dockerfile`, habilitar gate de lint/`pnpm audit` no CI e fechar pendências de LGPD. | `Dockerfile`, `ci.yml`, `docs/02_security.md` | `/privacy-pass` e `/dependency-audit` |
