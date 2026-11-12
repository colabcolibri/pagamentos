# 🎯 Front-Pagamento (`@quitou/admin`)

Aplicação web Next.js 16 (App Router) do **Quitou**: checkout público unificado, área do cliente (meus pedidos), painel administrativo e servidor **MCP (Model Context Protocol)** com OAuth 2.0 + PKCE.

## Quick start

O caminho curto está no [README da raiz](../README.md): copiar `.env.example` para `.env` e rodar `docker compose up --build`. As migrations ficam em `db/migrations` e o compose aplica com `scripts/apply-migrations.mjs`.

Para rodar `pnpm dev` diretamente neste pacote:

1. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` e `ACCESS_CODE_SECRET`.
2. Suba o PostgreSQL local com `docker compose -f ../deploy/postgres/compose.yml up -d` (`127.0.0.1:5435`).
3. Aplique as migrations com `node scripts/apply-migrations.mjs`.
4. Inicie o servidor em `http://localhost:3004` com `pnpm dev`.

## 📦 Funcionalidades Principais

1. **Checkout Transparente com Pagar.me e Asaas**
   - `src/app/checkout/[priceId]/page.tsx`
   - PIX, Boleto e Cartão de Crédito (Pagar.me) e PIX, Boleto à vista ou Boleto Parcelado (Asaas)
   - Cálculo de preço, promoções agendadas, opcionais (*add-ons*), *upsell* de plano e cupons de desconto validados exclusivamente no servidor
   - Polling inteligente de confirmação de pagamento (`src/hooks/use-payment-polling.ts`)

2. **Autenticação Passwordless por Código (OTP)**
   - `src/lib/auth/access-code.ts` e `src/lib/auth/session.ts`
   - Código de 6 dígitos com HMAC-SHA256 e sessão em cookie `httpOnly` respaldada por `payments.sessions` no PostgreSQL

3. **Painel Administrativo Completo (`/admin`)**
   - Gestão de produtos, preços, faixas de promoção, estoque/vagas e cupons
   - Gestão de pedidos, pagamentos (cancelamento, marcação manual auditada), assinaturas e logs de e-mail
   - Central de chaves e integrações (`payments.platform_settings`) com criptografia AES-256-GCM em repouso
   - Geração e edição assistida de produtos com IA (Google Gemini + leitor de URL com proteção anti-SSRF)

4. **Servidor MCP Administrativo (`/api/mcp`)**
   - Fluxo OAuth 2.0 Authorization Code + PKCE (`/api/mcp/oauth/*` e `/admin/mcp/consent`)
   - 26 ferramentas administrativas governadas por permissões granulares (`read`, `upsert`, `delete`) e trilha de auditoria (`payments.admin_audit_events`)

5. **Marca Configurável (*White-Label*)**
   - Nome, slogan, logotipo, razão social, CNPJ, links legais e e-mails de suporte/contato lidos em tempo de execução via variáveis `BRAND_*` (`src/lib/brand/`)

## 🎨 Stack Tecnológica

- **Framework:** Next.js 16 (App Router) + React 19
- **Estilização:** Tailwind CSS 4 + Radix UI / shadcn/ui
- **Banco de Dados:** PostgreSQL 16 (`pg` server-only, schema `payments`)
- **Pagamentos:** `@quitou/core` (Pagar.me + Asaas)
- **Testes:** Vitest

## 📁 Estrutura de Pastas

```text
front-pagamento/
├── db/
│   ├── migrations/                  # Migrations SQL do PostgreSQL (schema payments)
│   └── database.types.ts            # Tipagens das tabelas e views do banco
├── scripts/
│   └── apply-migrations.mjs         # Executor idempotente de migrations
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Vitrine pública de produtos
│   │   ├── checkout/                # Checkout e confirmação de pedido
│   │   ├── login/                   # Autenticação por código de 6 dígitos
│   │   ├── profile/                 # Pedidos do cliente autenticado
│   │   ├── admin/                   # Dashboard administrativo e tela de consentimento MCP
│   │   └── api/                     # Rotas REST (admin, auth, checkout, webhooks e MCP)
│   ├── components/                  # Componentes de UI (checkout, admin, brand, layout)
│   └── lib/
│       ├── auth/                    # Sessão, OTP e guards de API
│       ├── brand/                   # Configuração white-label (BRAND_*)
│       ├── db/                      # Pool PostgreSQL e query builder server-only
│       ├── mcp/                     # Servidor MCP, OAuth2/PKCE, políticas e ferramentas
│       ├── payments/                # Catálogo, pedidos, produtos e configurações
│       └── security/                # Rate limit, sanitização e criptografia de segredos
└── package.json
```

## 🧪 Scripts

```bash
pnpm dev           # Servidor de desenvolvimento (porta 3004)
pnpm build         # Build de produção
pnpm test          # Suíte de testes unitários (Vitest)
pnpm lint          # Verificação ESLint
pnpm format:check  # Verificação Prettier
```
