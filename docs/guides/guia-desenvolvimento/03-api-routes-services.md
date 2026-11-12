# Parte 3: API Routes e Services

## 🏗️ Arquitetura em camadas

O projeto Quitou segue uma arquitetura em camadas bem definida:

### Rotas de Pagamento (usam @quitou/core)

```
Client (React Component)
    ↓
Hook (use-*.ts) - TanStack Query
    ↓
API Route (/api/payments/{gateway}/checkout/route.ts)
    ↓
@quitou/core (createPagarmeCheckoutHandler, etc.)
    ↓
Gateway (Pagar.me / Asaas API)
```

### Rotas Administrativas (usam Services/Repositories)

```
Client (React Component)
    ↓
Hook (use-*.ts) - TanStack Query
    ↓
API Route (/api/admin/*/route.ts)
    ↓
Service (*.service.ts)
    ↓
Repository (interface + implementation)
    ↓
Database (Supabase/PostgreSQL)
```

**Regra de Ouro:**

- Rotas de pagamento usam `@quitou/core` handlers diretamente
- Rotas administrativas usam Services e Repositories
- Nunca pule camadas. Cada camada tem sua responsabilidade.

---

## 🎯 API Routes

### Quando Criar

- Toda operação que precisa acessar o servidor
- Integração com gateways de pagamento
- Operações administrativas
- Webhooks de pagamento

### Template Básico - Checkout

**Localização**: `src/app/api/payments/{gateway}/checkout/route.ts`

```typescript
import { createPagarmeCheckoutHandler } from '@quitou/core'

// Validar variáveis de ambiente
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não definido')
}
if (!process.env.PAGARME_SECRET_KEY) {
  throw new Error('PAGARME_SECRET_KEY não definido')
}

// Criar handler configurado
const handler = createPagarmeCheckoutHandler({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  pagarmeSecretKey: process.env.PAGARME_SECRET_KEY,
  pagarmeEnvironment: process.env.PAGARME_ENVIRONMENT || 'production',
  authCookieName: process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  maxInstallments: 12,
  expiresInMinutes: 60 * 24 * 15, // 15 dias
})

export const POST = handler
```

### Template Básico - Webhook

**Localização**: `src/app/api/payments/{gateway}/webhook/route.ts`

```typescript
import { createPagarmeWebhookHandler } from '@quitou/core'

// Validar variáveis de ambiente
if (!process.env.PAGARME_WEBHOOK_SECRET) {
  throw new Error('PAGARME_WEBHOOK_SECRET não definido')
}

// Criar handler configurado
const handler = createPagarmeWebhookHandler({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  pagarmeWebhookSecret: process.env.PAGARME_WEBHOOK_SECRET,
})

export const POST = handler
```

### Template - Rotas Administrativas (Como Deve Ser)

**Localização**: `src/app/api/admin/{resource}/route.ts`

```typescript
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/api-guards'
import { createApiHandler } from '@/lib/errors'
import { createServices } from '@/lib/payments/factories/service-factory'
import { productValidators } from '@/lib/payments/product'
import { validateQuery } from '@/lib/validators/helpers'

// Importar do domínio

/**
 * GET /api/admin/products
 * Lista todos os produtos
 * - Requer autenticação de admin
 */
export const GET = createApiHandler(
  async (request: Request) => {
    // 1. Autenticação e autorização
    const auth = await requireAdmin()
    if (!auth.success) {
      return auth.response
    }

    const { supabase } = auth
    const { productService } = createServices(supabase)

    // 2. Validar query parameters
    const url = new URL(request.url)
    const validation = validateQuery(productValidators.get, url.searchParams)

    if (!validation.success) {
      return validation.response
    }

    // 3. Business Logic (via Service)
    const products = await productService.getAllProducts({
      active: validation.data?.active,
    })

    // 4. Retorno
    return NextResponse.json({ products })
  },
  { module: 'payments', action: 'get_products' }
)

/**
 * POST /api/admin/products
 * Cria um novo produto
 * - Requer autenticação de admin
 */
export const POST = createApiHandler(
  async (request: Request) => {
    // 1. Autenticação e autorização
    const auth = await requireAdmin()
    if (!auth.success) {
      return auth.response
    }

    const { supabase } = auth
    const { productService } = createServices(supabase)

    // 2. Validar body
    const body = await request.json()
    const validation = validateRequest(productValidators.create, body)

    if (!validation.success) {
      return validation.response
    }

    // 3. Business Logic (via Service)
    const product = await productService.createProduct(validation.data)

    // 4. Retorno
    return NextResponse.json({ product }, { status: 201 })
  },
  { module: 'payments', action: 'create_product' }
)
```

### Clientes Supabase

O projeto usa dois tipos de clientes Supabase:

#### `createClient()` - Cliente do lado do servidor

**Localização**: `src/supabase/server.ts`

**Use quando:**

- ✅ API Routes que precisam de autenticação
- ✅ Server Components que precisam de dados autenticados
- ✅ Operações que dependem de cookies de sessão

**Exemplo:**

```typescript
import { createClient } from '@/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // ...
}
```

#### `supabase` - Cliente do lado do cliente

**Localização**: `src/supabase/client.ts`

**⚠️ IMPORTANTE**: Hooks **NÃO devem** usar Supabase diretamente. Devem chamar API Routes.

**Use quando:**

- ✅ Apenas em casos especiais (não recomendado)
- ✅ Quando não há API Route disponível (temporário)

**❌ NÃO USE em hooks normais** - Use API Routes:

```typescript
// ❌ ERRADO - Acesso direto ao Supabase
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase
        .schema('payments')
        .from('products')
        .select('*, prices(*)')
      return data
    },
  })
}

// ✅ CORRETO - Chama API Route
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/admin/products')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar produtos')
      }
      const { products } = await response.json()
      return products
    },
  })
}
```

---

## 🔧 Integração com @quitou/core

### Handlers Disponíveis

O `@quitou/core` fornece handlers prontos:

#### Pagar.me

- `createPagarmeCheckoutHandler` - Cria link de pagamento
- `createPagarmeWebhookHandler` - Processa webhooks

#### Asaas

- `createAsaasCheckoutHandler` - Cria boleto parcelado
- `createAsaasWebhookHandler` - Processa webhooks

### Configuração

**Variáveis de ambiente necessárias:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pagar.me
PAGARME_SECRET_KEY=
PAGARME_WEBHOOK_SECRET=
# PAGARME_ENVIRONMENT=  # omitir = production; use sandbox em dev/preview

# Asaas
ASAAS_API_KEY=
ASAAS_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_AUTH_COOKIE_NAME=quitou_auth_token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Validação de Variáveis

**Sempre valide variáveis de ambiente no topo do arquivo:**

```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não definido')
}
```

---

## 📋 Padrões de Rotas

### Rotas de Pagamento

```
/api/payments/
├── pagarme/
│   ├── checkout/route.ts    # POST - Criar pagamento
│   └── webhook/route.ts      # POST - Receber webhook
└── asaas/
    ├── checkout/route.ts     # POST - Criar boleto parcelado
    └── webhook/route.ts      # POST - Receber webhook
```

### Rotas Administrativas

```
/api/admin/
├── refund-policy-templates/
│   └── route.ts             # GET - Listar templates
└── resend-email/
    └── route.ts             # POST - Reenviar email
```

---

## 🔧 Services

### Quando Criar

- Toda lógica de negócio reutilizável
- Validações complexas de negócio
- Transformações de dados
- Orquestração de múltiplos repositories

### Template Básico

```typescript
// lib/payments/product/product.service.ts
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/domain-errors'

import type { ProductRepository } from './product.repository.interface'
import type { CreateProductDTO, Product, UpdateProductDTO } from './product.types'

/**
 * Service para gerenciar produtos
 * Contém lógica de negócio relacionada a produtos
 */
export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  /**
   * Busca um produto por ID
   * @throws {NotFoundError} Se produto não encontrado
   */
  async getProductById(id: string): Promise<Product> {
    if (!id) {
      throw new ValidationError('ID do produto é obrigatório', 'id')
    }

    const product = await this.productRepository.findById(id)

    if (!product) {
      throw new NotFoundError('Produto', id)
    }

    return product
  }

  /**
   * Lista todos os produtos
   */
  async getAllProducts(options?: { active?: boolean }): Promise<Product[]> {
    return this.productRepository.findAll({
      active: options?.active,
    })
  }

  /**
   * Cria um novo produto
   * @throws {ValidationError} Se dados inválidos
   * @throws {ConflictError} Se ref já existe
   */
  async createProduct(data: CreateProductDTO): Promise<Product> {
    // Validações de negócio
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Nome do produto é obrigatório', 'name')
    }

    // Verificar conflitos
    const existing = await this.productRepository.findByRef(data.ref)
    if (existing) {
      throw new ConflictError('Produto com este ref já existe')
    }

    // Criar produto
    return await this.productRepository.create(data)
  }
}
```

### Factory Pattern

```typescript
// lib/payments/factories/service-factory.ts
import type { SupabaseClient } from '@supabase/supabase-js'

import { OrderService, SupabaseOrderRepository } from '../order'
import { ProductService, SupabaseProductRepository } from '../product'

export function createServices(supabase: SupabaseClient) {
  // Criar repositories
  const productRepository = new SupabaseProductRepository(supabase)
  const orderRepository = new SupabaseOrderRepository(supabase)

  // Criar services com repositories injetados
  return {
    productService: new ProductService(productRepository),
    orderService: new OrderService(orderRepository),
  }
}
```

**Nota**: Cada domínio exporta tudo via `index.ts`, facilitando imports:

```typescript
// lib/payments/product/index.ts
export * from './product.types'
export * from './product.repository.interface'
export * from './supabase-product.repository'
export * from './product.service'
export * from './product.validators'
```

---

## ✅ Regras Obrigatórias

### Para Rotas de Pagamento

1. **Sempre valide variáveis de ambiente** no topo do arquivo
2. **Use handlers do @quitou/core** quando disponíveis
3. **Mantenha handlers simples** - apenas configuração

### Para Rotas Administrativas

1. **Sempre use `createApiHandler`** para tratamento centralizado de erros
2. **Sempre valide input** com validators Zod antes de processar
3. **Nunca acesse Supabase diretamente** - use Services
4. **Use `requireAdmin()`** para verificar admin
5. **Use `createServices()`** para criar services
6. **Use `validateRequest()` para body** e `validateQuery()` para query parameters
7. **Retorne sempre `NextResponse.json()`** para consistência
8. **Documente** regras de negócio e permissões no JSDoc
9. **Inclua contexto** no `createApiHandler` para logging (`{ module, action }`)

---

## 🎯 Exemplos Práticos

### Exemplo 1: Checkout Pagar.me

```typescript
// src/app/api/payments/pagarme/checkout/route.ts
import { createPagarmeCheckoutHandler } from '@quitou/core'

const handler = createPagarmeCheckoutHandler({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  pagarmeSecretKey: process.env.PAGARME_SECRET_KEY!,
  pagarmeEnvironment: 'sandbox',
  authCookieName: process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  maxInstallments: 12,
  expiresInMinutes: 60 * 24 * 15,
})

export const POST = handler
```

### Exemplo 2: Webhook Pagar.me

```typescript
// src/app/api/payments/pagarme/webhook/route.ts
import { createPagarmeWebhookHandler } from '@quitou/core'

const handler = createPagarmeWebhookHandler({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  pagarmeWebhookSecret: process.env.PAGARME_WEBHOOK_SECRET!,
})

export const POST = handler
```

### Exemplo 3: Rota Admin com Service (Como Deve Ser)

```typescript
// src/app/api/admin/resend-email/route.ts
import { requireAdmin } from '@/lib/auth/api-guards'
import { createApiHandler } from '@/lib/errors'
import { createServices } from '@/lib/payments/factories/service-factory'
import { orderValidators } from '@/lib/payments/order'
import { validateRequest } from '@/lib/validators/helpers'

// Importar do domínio

export const POST = createApiHandler(
  async (request: Request) => {
    // 1. Autenticação e autorização
    const auth = await requireAdmin()
    if (!auth.success) {
      return auth.response
    }

    const { supabase } = auth
    const { orderService } = createServices(supabase)

    // 2. Validar body
    const body = await request.json()
    const validation = validateRequest(orderValidators.resendEmail, body)

    if (!validation.success) {
      return validation.response
    }

    // 3. Business Logic (via Service)
    await orderService.resendEmail(validation.data.orderId, validation.data.emailType)

    // 4. Retorno
    return NextResponse.json({ success: true, message: 'Email reenviado com sucesso!' })
  },
  { module: 'payments', action: 'resend_email' }
)
```

---

## 📚 Próximos passos

- [Parte 4: Hooks e TanStack Query](05-hooks-tanstack-query.md)
- [Parte 6: Error Handling](06-error-handling-logging.md)
- [Checkout](../quitou/04-checkout.md)
- [Webhooks](../quitou/05-webhooks.md)
