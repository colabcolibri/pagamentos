# Arquitetura do Quitou

## 🏗️ Visão Geral

O Quitou é composto por dois componentes principais que trabalham juntos para fornecer uma solução completa de pagamentos:

1. **`@quitou/core`** - Pacote NPM com lógica de pagamentos
2. **`front-pagamento`** - Aplicação Next.js com interface e API Routes

---

## 📦 Componentes do Sistema

### 1. @quitou/core

**Localização**: `../pagamento/`

**Responsabilidades:**

- Integração com gateways (Pagar.me, Asaas)
- Criação de links de pagamento
- Processamento de webhooks
- Validações e utilitários
- Schema do banco de dados

**Características:**

- Framework-agnostic
- Minimalista (apenas lógica essencial)
- Extensível via `metadata` JSONB
- Type-safe com TypeScript

### 2. front-pagamento

**Localização**: `./` (este projeto)

**Responsabilidades:**

- Interface administrativa
- Páginas de checkout
- Componentes React
- API Routes (wrappers do @quitou/core)
- Hooks customizados

**Características:**

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/UI
- TanStack Query

---

## 🔄 Fluxo de Dados

### Checkout

```
Cliente (Browser)
    ↓
CheckoutForm Component
    ↓
usePaymentPolling Hook
    ↓
API Route: /api/payments/{gateway}/checkout
    ↓
@quitou/core: createPagarmeCheckoutHandler
    ↓
Pagar.me API
    ↓
Supabase Database
```

### Webhook

```
Gateway (Pagar.me/Asaas)
    ↓
API Route: /api/payments/{gateway}/webhook
    ↓
@quitou/core: createPagarmeWebhookHandler
    ↓
Supabase Database
    ↓
Polling detecta mudança
    ↓
Frontend atualiza UI
```

### Admin

```
Admin (Browser)
    ↓
Admin Component
    ↓
useProducts/useOrders Hook
    ↓
Supabase Client (direto)
    ↓
Supabase Database
```

---

## 🗄️ Estrutura do Banco de Dados

### Schema: `payments`

**Tabelas principais:**

- `products` - Produtos vendidos
- `prices` - Preços dos produtos
- `orders` - Pedidos realizados
- `pagarme_payments` - Pagamentos Pagar.me
- `asaas_payments` - Pagamentos Asaas
- `subscriptions` - Assinaturas recorrentes
- `admin_users` - Usuários administradores
- `profiles` - Perfis de usuários
- `webhook_events` - Logs de webhooks
- `email_logs` - Logs de emails

**Funções:**

- `is_admin_user()` - Verifica se usuário é admin
- `is_super_admin()` - Verifica se usuário é super admin

**RLS (Row Level Security):**

- Todas as tabelas têm RLS habilitado
- Políticas específicas por tabela
- Admin users protegidos por RLS

---

## 🔐 Segurança

### Autenticação

- **Cookies compartilhados**: Mesmo cookie entre sistemas
- **Verificação server-side**: Sempre verificar no servidor
- **RLS no banco**: Proteção adicional no nível do banco

### Autorização

- **Admin users**: Tabela separada `admin_users`
- **Verificação via RPC**: `is_admin_user()` e `is_super_admin()`
- **Proteção de rotas**: Middleware e layouts verificam admin

### Webhooks

- **Validação de assinatura**: Sempre validar webhooks
- **Idempotência**: Processar eventos apenas uma vez
- **Logs**: Registrar todos os eventos

---

## 📁 Estrutura de Pastas

```
front-pagamento/
├── src/
│   ├── app/                    # App Router
│   │   ├── admin/              # Painel admin
│   │   ├── api/                # API Routes
│   │   ├── checkout/           # Checkout
│   │   └── login/              # Login
│   │
│   ├── components/             # Componentes React
│   │   ├── admin/              # Componentes admin
│   │   ├── checkout/           # Componentes checkout
│   │   ├── payment/            # Componentes pagamento
│   │   └── ui/                 # Shadcn/UI
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── admin/              # Hooks admin
│   │   └── use-payment-polling.ts
│   │
│   ├── lib/                    # Utilitários
│   │   └── utils.ts
│   │
│   └── supabase/               # Clientes Supabase
│       ├── client.ts           # Cliente browser
│       └── server.ts           # Cliente servidor
│
└── supabase/                   # Configuração Supabase
    ├── migrations/             # Migrations SQL
    └── seed.sql                # Dados de exemplo
```

---

## 🔧 Integrações

### Gateways de Pagamento

#### Pagar.me

- **Checkout**: Cartão, PIX, Boleto
- **Webhooks**: Eventos de pagamento
- **Ambiente**: Sandbox e Production

#### Asaas

- **Checkout**: Boleto Parcelado
- **Webhooks**: Eventos de pagamento
- **Ambiente**: Sandbox e Production

### Supabase

- **Database**: PostgreSQL
- **Auth**: Autenticação de usuários
- **Storage**: (não usado no quitou)
- **Realtime**: (não usado no quitou)

---

## 🎯 Princípios Arquiteturais

### 1. Separação de Responsabilidades

- **@quitou/core**: Lógica de pagamentos
- **front-pagamento**: Interface e orquestração

### 2. Type Safety

- TypeScript em todo o código
- Tipos gerados do Supabase
- Validação com Zod

### 3. Reutilização

- Handlers do @quitou/core
- Componentes React reutilizáveis
- Hooks customizados

### 4. Segurança

- Verificação server-side
- RLS no banco
- Validação de webhooks

---

## 📚 Próximos Passos

- [Visão Geral](01-visao-geral.md)
- [Sistema de Pagamentos](03-pagamentos.md)
- [Checkout](04-checkout.md)
- [Webhooks](05-webhooks.md)
- [Painel Admin](06-admin.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
