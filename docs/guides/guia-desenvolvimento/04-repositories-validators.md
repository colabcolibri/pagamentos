# Parte 4: Repositories e Validators

---

## 💾 Repositories

> **📁 Estrutura por Domínio**: Cada domínio (product, order, etc.) tem sua própria pasta com todos os arquivos relacionados (repository, service, validators, types).

### Quando Criar

- Toda entidade que precisa persistir dados
- Uma interface + uma implementação por entidade
- Organize por domínio: `src/lib/payments/{domain}/`

### Estrutura de Domínio

```
src/lib/payments/
├── product/
│   ├── product.types.ts                    # Types e DTOs
│   ├── product.repository.interface.ts    # Interface do repository
│   ├── supabase-product.repository.ts     # Implementação Supabase
│   ├── product.service.ts                  # Service (lógica de negócio)
│   ├── product.validators.ts               # Validators Zod
│   └── index.ts                            # Exports públicos
│
└── order/
    ├── order.types.ts
    ├── order.repository.interface.ts
    ├── supabase-order.repository.ts
    ├── order.service.ts
    ├── order.validators.ts
    └── index.ts
```

### Template - Types (product.types.ts)

```typescript
// lib/payments/product/product.types.ts

export interface Product {
  id: string
  name: string
  ref: string
  description: string | null
  active: boolean
  payment_methods: string[] | null
  refund_policy: Record<string, any> | null
  email_config: Record<string, any> | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
  prices?: Price[]
}

export interface CreateProductDTO {
  name: string
  ref: string
  description?: string | null
  active?: boolean
  payment_methods?: string[]
  refund_policy?: Record<string, any> | null
  email_config?: Record<string, any> | null
  metadata?: Record<string, any> | null
}

export interface UpdateProductDTO {
  name?: string
  ref?: string
  description?: string | null
  active?: boolean
  payment_methods?: string[]
  refund_policy?: Record<string, any> | null
  email_config?: Record<string, any> | null
  metadata?: Record<string, any> | null
}
```

### Template - Interface (product.repository.interface.ts)

```typescript
// lib/payments/product/product.repository.interface.ts
import type { CreateProductDTO, Product, UpdateProductDTO } from './product.types'

/**
 * Interface do repositório de produtos
 */
export interface ProductRepository {
  /**
   * Busca um produto por ID
   */
  findById(id: string): Promise<Product | null>

  /**
   * Busca um produto por ref
   */
  findByRef(ref: string): Promise<Product | null>

  /**
   * Busca todos os produtos
   */
  findAll(): Promise<Product[]>

  /**
   * Cria um novo produto
   */
  create(data: CreateProductDTO): Promise<Product>

  /**
   * Atualiza um produto existente
   */
  update(id: string, data: UpdateProductDTO): Promise<Product>

  /**
   * Deleta um produto
   */
  delete(id: string): Promise<void>

  /**
   * Verifica se um produto existe
   */
  exists(id: string): Promise<boolean>
}
```

### Template - Implementation (supabase-product.repository.ts)

```typescript
// lib/payments/product/supabase-product.repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

import type {
  CreateProductDTO,
  ProductRepository,
  UpdateProductDTO,
} from './product.repository.interface'
import type { Product } from './product.types'

type DbProduct = Database['payments']['Tables']['products']['Row']
type DbProductInsert = Database['payments']['Tables']['products']['Insert']
type DbProductUpdate = Database['payments']['Tables']['products']['Update']

export class SupabaseProductRepository implements ProductRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('products')
      .select('*, prices(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrado
        return null
      }
      throw error
    }

    return data as Product
  }

  async findByRef(ref: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('products')
      .select('*, prices(*)')
      .eq('ref', ref)
      .eq('active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data as Product
  }

  async findAll(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .schema('payments')
      .from('products')
      .select('*, prices(*)')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return (data || []) as Product[]
  }

  async create(data: CreateProductDTO): Promise<Product> {
    const insertData: DbProductInsert = {
      name: data.name,
      ref: data.ref,
      description: data.description,
      active: data.active ?? true,
      payment_methods: data.payment_methods || null,
      refund_policy: data.refund_policy || null,
      email_config: data.email_config || null,
      metadata: data.metadata || null,
    }

    const { data: product, error } = await this.supabase
      .schema('payments')
      .from('products')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return product as Product
  }

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const updateData: DbProductUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: product, error } = await this.supabase
      .schema('payments')
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return product as Product
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.schema('payments').from('products').delete().eq('id', id)

    if (error) {
      throw error
    }
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.findById(id)
    return product !== null
  }
}
```

### Regras Obrigatórias

1. **Sempre retorne tipos do domínio** (`Product`, `Order`, etc.) - não tipos do banco diretamente
2. **Use tipos do Database** (`DbProduct`, `DbProductInsert`, `DbProductUpdate`) para queries
3. **Trate `PGRST116`** como "não encontrado" (retorne `null`, não erro)
4. **Lance erros do Supabase** diretamente (serão tratados pelo error handler)
5. **Implemente apenas métodos da interface** - não adicione métodos extras
6. **Use `.single()`** para queries que esperam um único resultado
7. **Sempre use schema `payments`** ao acessar tabelas
8. **Documente** métodos complexos com JSDoc

---

## ✅ Validators

### Quando Criar

- Toda entrada de dados (API Routes)
- Um arquivo de validators por módulo ou entidade principal

### Template Básico (product.validators.ts)

```typescript
// lib/payments/product/product.validators.ts
import { z } from 'zod'
import { uuidSchema } from '@/lib/validators/common'

/**
 * Validators para Product
 */
export const productValidators = {
  create: z.object({
      name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
      ref: z.string().min(1, 'Ref é obrigatório').max(100, 'Ref muito longo'),
      description: z.string().max(5000, 'Descrição muito longa').optional().nullable(),
      active: z.boolean().optional(),
      payment_methods: z.array(z.string()).optional().nullable(),
      refund_policy: z.record(z.any()).optional().nullable(),
      email_config: z.record(z.any()).optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
    }),

    update: z.object({
      name: z.string().min(1, 'Nome não pode ser vazio').max(255, 'Nome muito longo').optional(),
      ref: z.string().min(1, 'Ref não pode ser vazio').max(100, 'Ref muito longo').optional(),
      description: z.string().max(5000, 'Descrição muito longa').optional().nullable(),
      active: z.boolean().optional(),
      payment_methods: z.array(z.string()).optional().nullable(),
      refund_policy: z.record(z.any()).optional().nullable(),
      email_config: z.record(z.any()).optional().nullable(),
      metadata: z.record(z.any()).optional().nullable(),
    }),

    get: z.object({
      active: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
    }),
  },

  order: {
    resendEmail: z.object({
      orderId: uuidSchema,
      emailType: z.enum(['order_created', 'payment_confirmed'], {
        errorMap: () => ({ message: 'Tipo de email inválido' }),
      }),
    }),

    get: z.object({
      status: z.enum(['pending', 'paid', 'cancelled', 'refunded']).optional().nullable(),
      gateway: z.enum(['pagarme', 'asaas']).optional().nullable(),
    }),
  },
}
```

### Schemas Comuns

```typescript
// lib/validators/common.ts
import { z } from 'zod'

/**
 * Schema para UUID
 */
export const uuidSchema = z.string().uuid('ID inválido')

/**
 * Schema para email
 */
export const emailSchema = z.string().email('E-mail inválido')

/**
 * Schema para CPF
 */
export const cpfSchema = z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')

/**
 * Schema para paginação
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})
```

### Regras Obrigatórias

1. **Sempre use Zod** para validação
2. **Mensagens de erro claras** em português
3. **Schemas separados** para Create, Update, Get (query params)
4. **Use schemas comuns** de `@/lib/validators/common` (uuidSchema, etc.)
5. **Valide formatos** (email, URL, UUID, CPF, etc.)
6. **Use `.transform()`** para converter tipos quando necessário (ex: string → boolean)
7. **Organize por entidade** dentro do objeto de validators

### Nomenclatura

- **Estrutura**: `{module}Validators.{entity}.{action}`
- **Exemplos**: `paymentsValidators.product.create`, `paymentsValidators.order.resendEmail`

### Uso em API Routes

```typescript
import { validateRequest, validateQuery } from '@/lib/validators/helpers'
import { productValidators } from '@/lib/payments/product' // Importar do domínio

// Validar body
const validation = validateRequest(productValidators.create, body)
if (!validation.success) {
  return validation.response
}

// Validar query params
const url = new URL(request.url)
const validation = validateQuery(productValidators.get, url.searchParams)
if (!validation.success) {
  return validation.response
}
```

**Ou usar consolidado:**

```typescript
import { paymentsValidators } from '@/lib/validators/payments.validators'

const validation = validateRequest(paymentsValidators.product.create, body)
```

### Helpers de Validação

```typescript
// lib/validators/helpers.ts
import { NextResponse } from 'next/server'

import type { ZodError, ZodSchema } from 'zod'

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: ZodError
  response?: NextResponse
}

/**
 * Valida o body da requisição
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      response: NextResponse.json(
        {
          error: 'Dados inválidos',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Valida query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  const params = Object.fromEntries(searchParams.entries())
  return validateRequest(schema, params)
}
```

---

## ✅ Checklist ao criar Domínio

### Estrutura de Arquivos

- [ ] Criar pasta `src/lib/payments/{domain}/`
- [ ] Criar `{domain}.types.ts` com types e DTOs
- [ ] Criar `{domain}.repository.interface.ts` com interface
- [ ] Criar `supabase-{domain}.repository.ts` com implementação
- [ ] Criar `{domain}.service.ts` com lógica de negócio
- [ ] Criar `{domain}.validators.ts` com validators Zod
- [ ] Criar `index.ts` com exports públicos

### Repository

- [ ] Criar interface primeiro
- [ ] Implementar todos os métodos da interface
- [ ] Usar tipos do Database (`Db{Entity}`, `Db{Entity}Insert`, etc.)
- [ ] Tratar `PGRST116` como "não encontrado" (retornar `null`)
- [ ] Lançar erros do Supabase diretamente (serão tratados pelo error handler)
- [ ] Sempre usar schema `payments`
- [ ] Documentar métodos complexos

### Validators

- [ ] Usar Zod
- [ ] Criar schemas separados para Create, Update, Get
- [ ] Mensagens de erro em português
- [ ] Usar schemas comuns de `@/lib/validators/common`
- [ ] Validar formatos (email, URL, UUID, CPF, etc.)

---

## 📚 Próximos passos

- [Parte 3: API Routes e Services](03-api-routes-services.md)
- [Parte 5: Hooks e TanStack Query](05-hooks-tanstack-query.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
