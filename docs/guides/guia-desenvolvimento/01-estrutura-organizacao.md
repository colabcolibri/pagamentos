# Parte 1: Estrutura e organização

## 📂 Estrutura de pastas

```
front-pagamento/
# Documentação está na raiz do monorepo: `docs/`
│   ├── guides/                # Guias de desenvolvimento e design
│   ├── references/            # Referências técnicas
│   └── PLANO-AVALIACAO.md     # Plano de adaptação
│
├── supabase/                  # Configuração Supabase
│   ├── migrations/            # Migrações SQL
│   ├── config.toml
│   └── seed.sql               # Dados de exemplo
│
├── public/                    # Arquivos estáticos
│   ├── logos/                 # Logos da marca
│   └── icon.svg
│
├── src/
│   ├── app/                   # App Router do Next.js
│   │   ├── admin/             # Painel administrativo
│   │   │   ├── products/      # Gerenciamento de produtos
│   │   │   ├── orders/        # Gerenciamento de pedidos
│   │   │   └── page.tsx       # Dashboard admin
│   │   │
│   │   ├── api/               # API Routes
│   │   │   ├── admin/         # Rotas administrativas
│   │   │   └── payments/      # Rotas de pagamento
│   │   │       ├── pagarme/   # Pagar.me
│   │   │       │   ├── checkout/
│   │   │       │   └── webhook/
│   │   │       └── asaas/     # Asaas
│   │   │           ├── checkout/
│   │   │           └── webhook/
│   │   │
│   │   ├── checkout/          # Página de checkout
│   │   │   └── [priceId]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── login/             # Página de login
│   │   ├── profile/           # Perfil do usuário
│   │   ├── page.tsx           # Home pública
│   │   └── layout.tsx         # Layout raiz
│   │
│   ├── components/            # Componentes React
│   │   ├── admin/             # Componentes administrativos
│   │   │   ├── admin-page-header.tsx
│   │   │   ├── admin-page-layout.tsx
│   │   │   └── app-sidebar.tsx
│   │   │
│   │   ├── auth/              # Autenticação
│   │   │   └── login-form.tsx
│   │   │
│   │   ├── checkout/          # Componentes de checkout
│   │   │   └── checkout-form.tsx
│   │   │
│   │   ├── layout/            # Componentes de layout
│   │   │   └── ui/            # Componentes UI customizados
│   │   │       ├── dialog.tsx
│   │   │       └── toast.tsx
│   │   │
│   │   ├── payment/           # Componentes de pagamento
│   │   │   ├── payment-data-form.tsx
│   │   │   ├── payment-status.tsx
│   │   │   └── gateway-selector.tsx
│   │   │
│   │   ├── refund-policy/     # Políticas de reembolso
│   │   │   └── refund-policy-modal.tsx
│   │   │
│   │   ├── providers/         # Providers React
│   │   │   └── query-provider.tsx
│   │   │
│   │   └── ui/                # Componentes shadcn/ui
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── admin/             # Hooks administrativos
│   │   │   ├── use-dashboard-stats.ts
│   │   │   ├── use-orders.ts
│   │   │   ├── use-products.ts
│   │   │   └── use-payments.ts
│   │   │
│   │   ├── use-admin.ts       # Hook de admin
│   │   ├── use-mobile.ts      # Hook de responsividade
│   │   ├── use-payment-polling.ts
│   │   └── use-product-price.ts
│   │
│   ├── lib/                   # Bibliotecas e utilitários
│   │   ├── email-helpers.ts   # Helpers de email
│   │   └── utils.ts           # Utilitários gerais
│   │
│   ├── config/                # Configurações
│   │   └── sizes.ts           # Tamanhos e breakpoints
│   │
│   └── supabase/              # Cliente Supabase
│       ├── client.ts          # Cliente do lado do cliente
│       └── server.ts          # Cliente do lado do servidor
│
├── scripts/                   # Scripts utilitários
│   └── generate-types-local.mjs
│
├── .cursor/                  # Configurações Cursor
├── .husky/                   # Git hooks
├── next.config.ts            # Configuração Next.js
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências
```

---

## 📁 Organização de arquivos

### App Router (`src/app/`)

```
app/
├── admin/                    # Painel administrativo
│   ├── products/             # Gerenciamento de produtos
│   │   └── page.tsx          # /admin/products
│   ├── orders/               # Gerenciamento de pedidos
│   │   └── page.tsx          # /admin/orders
│   ├── layout.tsx            # Layout do admin
│   └── page.tsx              # Dashboard (/admin)
│
├── api/                      # API Routes
│   ├── admin/                # Rotas administrativas
│   │   ├── refund-policy-templates/
│   │   │   └── route.ts      # GET /api/admin/refund-policy-templates
│   │   └── resend-email/
│   │       └── route.ts      # POST /api/admin/resend-email
│   │
│   └── payments/             # Rotas de pagamento
│       ├── pagarme/
│       │   ├── checkout/
│       │   │   └── route.ts   # POST /api/payments/pagarme/checkout
│       │   └── webhook/
│       │       └── route.ts  # POST /api/payments/pagarme/webhook
│       │
│       └── asaas/
│           ├── checkout/
│           │   └── route.ts   # POST /api/payments/asaas/checkout
│           └── webhook/
│               └── route.ts  # POST /api/payments/asaas/webhook
│
├── checkout/                 # Página de checkout
│   └── [priceId]/
│       └── page.tsx          # /checkout/[priceId]
│
├── login/                    # Página de login
│   └── page.tsx              # /login
│
├── profile/                  # Perfil do usuário
│   └── page.tsx              # /profile
│
├── page.tsx                   # Home pública (/)
└── layout.tsx                # Layout raiz
```

### API Routes (`src/app/api/`)

```
api/
├── admin/
│   ├── {resource}/
│   │   └── route.ts          # GET, POST /api/admin/{resource}
│   │
│   └── {resource}/
│       └── {action}/
│           └── route.ts      # Rotas específicas
│
└── payments/
    ├── {gateway}/
    │   ├── checkout/
    │   │   └── route.ts      # POST /api/payments/{gateway}/checkout
    │   └── webhook/
    │       └── route.ts      # POST /api/payments/{gateway}/webhook
```

**Exemplo:**

```
api/
├── admin/
│   └── refund-policy-templates/
│       └── route.ts          # GET /api/admin/refund-policy-templates
│
└── payments/
    ├── pagarme/
    │   ├── checkout/
    │   │   └── route.ts      # POST /api/payments/pagarme/checkout
    │   └── webhook/
    │       └── route.ts      # POST /api/payments/pagarme/webhook
    │
    └── asaas/
        ├── checkout/
        │   └── route.ts       # POST /api/payments/asaas/checkout
        └── webhook/
            └── route.ts      # POST /api/payments/asaas/webhook
```

### Componentes (`src/components/`)

```
components/
├── admin/                    # Componentes administrativos
│   ├── admin-page-header.tsx
│   ├── admin-page-layout.tsx
│   └── app-sidebar.tsx
│
├── auth/                     # Autenticação
│   └── login-form.tsx
│
├── checkout/                 # Checkout
│   └── checkout-form.tsx
│
├── layout/                   # Layout
│   └── ui/                   # UI customizados
│       ├── dialog.tsx
│       └── toast.tsx
│
├── payment/                  # Pagamento
│   ├── payment-data-form.tsx
│   ├── payment-status.tsx
│   └── gateway-selector.tsx
│
├── refund-policy/            # Políticas de reembolso
│   └── refund-policy-modal.tsx
│
├── providers/                # Providers
│   └── query-provider.tsx
│
└── ui/                       # Componentes shadcn/ui
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...
```

### Hooks (`src/hooks/`)

```
hooks/
├── admin/                    # Hooks administrativos
│   ├── use-dashboard-stats.ts
│   ├── use-orders.ts
│   ├── use-products.ts
│   └── use-payments.ts
│
├── use-admin.ts              # Verificação de admin
├── use-mobile.ts             # Detecção de mobile
├── use-payment-polling.ts     # Polling de pagamento
└── use-product-price.ts       # Hook de preço
```

### Lib compartilhada (`src/lib/`)

```
lib/
├── email-helpers.ts          # Helpers de email
└── utils.ts                  # Utilitários gerais (cn, etc.)
```

---

## 🏷️ Convenções de nomenclatura

### Arquivos e pastas

| Tipo             | Padrão                       | Exemplo                                          |
| ---------------- | ---------------------------- | ------------------------------------------------ |
| API Route        | `route.ts`                   | `src/app/api/payments/pagarme/checkout/route.ts` |
| Componente React | `*.tsx`                      | `checkout-form.tsx`, `payment-status.tsx`        |
| Hook             | `use-*.ts`                   | `use-payment-polling.ts`, `use-products.ts`      |
| Helper/Util      | `*-helpers.ts` ou `utils.ts` | `email-helpers.ts`, `utils.ts`                   |
| Config           | `*.ts`                       | `sizes.ts`                                       |

### Regras de nomenclatura

1. **Sempre use kebab-case** para arquivos e pastas (não camelCase, não snake_case)
2. **Nomes descritivos e específicos**: `payment-status.tsx` ✅, não `ps.tsx` ❌
3. **Sufixos obrigatórios**: `.tsx` para componentes, `.ts` para código
4. **Nomes em inglês** para código (components, hooks, utils)
5. **Nomes em português** apenas para mensagens de erro e comentários

### Componentes React

```tsx
// ✅ Correto
export function PaymentStatus() { ... }
export default function CheckoutForm() { ... }

// ❌ Evitar
export function paymentStatus() { ... }
export default function checkout_form() { ... }
```

### Variáveis e funções

```typescript
// ✅ Correto
const paymentId = 'pay_123'
function getPaymentStatus() { ... }
const isPaid = true

// ❌ Evitar
const PaymentId = 'pay_123'
function GetPaymentStatus() { ... }
const IsPaid = true
```

### Tipos e interfaces

```typescript
// ✅ Correto
interface PaymentData { ... }
type PaymentStatus = 'pending' | 'paid' | 'cancelled'
type Props = { ... }

// ❌ Evitar
interface paymentData { ... }
type paymentStatus = ...
```

---

## 🔗 Path aliases

O projeto usa aliases configurados no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Uso

```typescript
// ✅ Usar aliases
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/admin/use-products'

// ❌ Evitar paths relativos longos
import { cn } from '../../../lib/utils'
```

### Aliases disponíveis

- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/app` → `src/app`
- `@/config` → `src/config`

---

## 📝 Estrutura de uma feature completa

### Exemplo: Sistema de Checkout

```
app/
├── checkout/
│   └── [priceId]/
│       └── page.tsx          # Página de checkout
│
├── api/
│   └── payments/
│       └── pagarme/
│           └── checkout/
│               └── route.ts  # API Route de checkout
│
components/
├── checkout/
│   └── checkout-form.tsx     # Formulário de checkout
│
└── payment/
    ├── payment-data-form.tsx
    ├── payment-status.tsx
    └── gateway-selector.tsx
│
hooks/
└── use-payment-polling.ts    # Hook de polling
```

### Fluxo de dados

```
Component (checkout-form.tsx)
    ↓
Hook (use-payment-polling.ts)
    ↓
API Route (/api/payments/pagarme/checkout/route.ts)
    ↓
@quitou/core (createPagarmeService)
    ↓
Gateway (Pagar.me API)
```

---

## 🎯 Checklist ao criar novo arquivo

- [ ] Nome segue convenções (`kebab-case` para arquivos, `PascalCase` para componentes)
- [ ] Usa path aliases (`@/`) ao invés de paths relativos
- [ ] Tipos TypeScript definidos
- [ ] Exporta corretamente (named ou default)
- [ ] Responsivo (mobile-first)
- [ ] Documentado (se necessário)

---

## 📚 Próximos passos

- [Parte 2: Componentes e UI](02-componentes-ui.md)
- [Parte 3: API Routes e Services](03-api-routes-services.md)
