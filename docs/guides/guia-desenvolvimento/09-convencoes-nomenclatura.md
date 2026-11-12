# Parte 9: Convenções de nomenclatura

## 🏷️ Regras Gerais

### Arquivos e Pastas

**Sempre use `kebab-case`:**

```typescript
// ✅ Correto
payment - status.tsx
checkout - form.tsx
use - payment - polling.ts
admin - page - header.tsx

// ❌ Errado
PaymentStatus.tsx
checkoutForm.tsx
usePaymentPolling.ts
adminPageHeader.tsx
```

### Componentes React

**Use `PascalCase` para nomes de componentes:**

```typescript
// ✅ Correto
export function PaymentStatus() { ... }
export default function CheckoutForm() { ... }

// ❌ Errado
export function paymentStatus() { ... }
export default function checkout_form() { ... }
```

### Variáveis e Funções

**Use `camelCase`:**

```typescript
// ✅ Correto
const paymentId = 'pay_123'
function getPaymentStatus() { ... }
const isPaid = true

// ❌ Errado
const PaymentId = 'pay_123'
function GetPaymentStatus() { ... }
const IsPaid = true
```

### Tipos e Interfaces

**Use `PascalCase`:**

```typescript
// ✅ Correto
interface PaymentData { ... }
type PaymentStatus = 'pending' | 'paid' | 'cancelled'
type Props = { ... }

// ❌ Errado
interface paymentData { ... }
type paymentStatus = ...
```

---

## 📁 Estrutura de Nomes

### API Routes

```
route.ts                    # Sempre "route.ts"
```

**Exemplos:**

- `src/app/api/payments/pagarme/checkout/route.ts`
- `src/app/api/payments/asaas/webhook/route.ts`
- `src/app/api/admin/products/route.ts`

### Componentes

```
{feature}-{component}.tsx
```

**Exemplos:**

- `payment-status.tsx`
- `checkout-form.tsx`
- `admin-page-header.tsx`
- `gateway-selector.tsx`

### Hooks

```
use-{feature}.ts
```

**Exemplos:**

- `use-payment-polling.ts`
- `use-products.ts`
- `use-orders.ts`
- `use-admin.ts`

### Utilitários

```
{feature}-helpers.ts
utils.ts
```

**Exemplos:**

- `email-helpers.ts`
- `utils.ts`

---

## 🎯 Convenções Específicas

### Banco de Dados

**Tabelas e colunas: `snake_case`:**

```sql
-- ✅ Correto
CREATE TABLE payments.products (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  created_at TIMESTAMP,
  payment_methods JSONB
);

-- ❌ Errado
CREATE TABLE payments.Products (
  id UUID PRIMARY KEY,
  Name VARCHAR(255),
  CreatedAt TIMESTAMP
);
```

**Funções: `snake_case`:**

```sql
-- ✅ Correto
CREATE FUNCTION payments.is_admin_user()
RETURNS BOOLEAN AS $$ ... $$;

-- ❌ Errado
CREATE FUNCTION payments.isAdminUser()
RETURNS BOOLEAN AS $$ ... $$;
```

### Variáveis de Ambiente

**UPPER_SNAKE_CASE:**

```env
# ✅ Correto
NEXT_PUBLIC_SUPABASE_URL=
PAGARME_SECRET_KEY=
NEXT_PUBLIC_AUTH_COOKIE_NAME=

# ❌ Errado
nextPublicSupabaseUrl=
pagarmeSecretKey=
```

### Constantes

**UPPER_SNAKE_CASE ou objetos:**

```typescript
// ✅ Correto - Constantes simples
const MAX_RETRIES = 3
const POLLING_INTERVAL = 3000

// ✅ Correto - Objetos de configuração
const CONFIG = {
  maxRetries: 3,
  pollingInterval: 3000,
} as const
```

---

## 📋 Padrões por Contexto

### Componentes de Pagamento

```typescript
// Arquivo: payment-status.tsx
export function PaymentStatus() { ... }

// Arquivo: payment-data-form.tsx
export function PaymentDataForm() { ... }

// Arquivo: gateway-selector.tsx
export function GatewaySelector() { ... }
```

### Hooks de Admin

```typescript
// Arquivo: use-products.ts
export function useProducts() { ... }

// Arquivo: use-orders.ts
export function useOrders() { ... }

// Arquivo: use-dashboard-stats.ts
export function useDashboardStats() { ... }
```

### API Routes

```typescript
// Arquivo: route.ts (sempre)
export async function POST(request: Request) { ... }
export async function GET(request: Request) { ... }
```

---

## ✅ Checklist

Ao criar um novo arquivo, verifique:

- [ ] Nome do arquivo em `kebab-case`
- [ ] Nome do componente em `PascalCase`
- [ ] Variáveis em `camelCase`
- [ ] Tipos em `PascalCase`
- [ ] Constantes em `UPPER_SNAKE_CASE` ou objetos
- [ ] Nomes descritivos e específicos
- [ ] Sem abreviações desnecessárias

---

## 📚 Próximos passos

- [Parte 1: Estrutura e Organização](01-estrutura-organizacao.md)
- [Parte 2: Componentes e UI](02-componentes-ui.md)
