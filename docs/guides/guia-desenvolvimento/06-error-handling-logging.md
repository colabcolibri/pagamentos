# Parte 6: Error Handling e Logging

---

## ⚠️ Hierarquia de Erros

```typescript
BaseError (classe base)
├── NotFoundError (404)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── ConflictError (409)
└── DatabaseError (500)
```

### Quando Usar Cada Erro

- **`NotFoundError`**: Recurso não encontrado
- **`ValidationError`**: Dados inválidos (validação de negócio ou Zod)
- **`UnauthorizedError`**: Usuário não autenticado
- **`ForbiddenError`**: Usuário autenticado mas sem permissão
- **`ConflictError`**: Conflito (ex: ref já cadastrado)
- **`DatabaseError`**: Erro de banco de dados

---

## 🎯 Error Handling em Services

### Template de Uso

```typescript
import { NotFoundError, ValidationError } from '@/lib/errors/domain-errors'

export class ProductService {
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

  async createProduct(data: CreateProductDTO): Promise<Product> {
    // Validações de negócio
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Nome do produto é obrigatório', 'name')
    }

    if (data.name.length > 255) {
      throw new ValidationError('Nome do produto deve ter no máximo 255 caracteres', 'name')
    }

    // Verificar conflitos
    const existing = await this.productRepository.findByRef(data.ref)
    if (existing) {
      throw new ConflictError('Produto com este ref já existe')
    }

    return await this.productRepository.create(data)
  }
}
```

### Regras Obrigatórias

1. **Lance erros customizados** em Services (não retorne `{ success: false }`)
2. **Não capture erros** em Services - deixe propagar
3. **Mensagens em português** e descritivas
4. **Inclua contexto** quando possível (resource, identifier, etc.)

---

## 🛡️ Error Handling em API Routes

### Template com createApiHandler

```typescript
import { requireAdmin } from '@/lib/auth/api-guards'
import { NotFoundError, createApiHandler } from '@/lib/errors'
import { createServices } from '@/lib/payments/services'

/**
 * GET /api/admin/products/[id]
 * Busca um produto por ID
 */
export const GET = createApiHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const { id } = await params
    const { supabase } = auth
    const { productService } = createServices(supabase)

    // Service pode lançar NotFoundError - será tratado automaticamente
    const product = await productService.getProductById(id)

    return NextResponse.json({ product })
  },
  { module: 'payments', action: 'get_product' }
)
```

### O que createApiHandler faz

1. **Captura erros** automaticamente
2. **Converte erros customizados** em respostas HTTP apropriadas
3. **Loga erros** estruturados
4. **Retorna respostas consistentes**

### Respostas de Erro

```typescript
// NotFoundError → 404
{
  error: 'Produto não encontrado',
  resource: 'product',
  identifier: '123'
}

// ValidationError → 400
{
  error: 'Dados inválidos',
  field: 'name',
  message: 'Nome do produto é obrigatório'
}

// UnauthorizedError → 401
{
  error: 'Não autenticado'
}

// ForbiddenError → 403
{
  error: 'Sem permissão'
}

// ConflictError → 409
{
  error: 'Produto com este ref já existe'
}

// DatabaseError → 500
{
  error: 'Erro interno do servidor'
}
```

---

## 📊 Logging Estruturado

### Quando Usar

- **Services**: Logs de operações importantes (create, update, delete, erros)
- **API Routes**: Logs automáticos via `createApiHandler` (não precisa logar manualmente)

### Template

```typescript
import { getLogger } from '@/lib/logger'

export class ProductService {
  private logger = getLogger()

  async createProduct(data: CreateProductDTO, userId: string): Promise<Product> {
    this.logger.info('Criando produto', { data, userId })

    try {
      const product = await this.productRepository.create(data)

      this.logger.info('Produto criado com sucesso', {
        productId: product.id,
        userId,
      })

      return product
    } catch (error) {
      this.logger.error('Erro ao criar produto', {
        error,
        data,
        userId,
      })
      throw error
    }
  }
}
```

### Níveis de Log

```typescript
logger.debug('Informação de debug', { ... })
logger.info('Operação realizada', { ... })
logger.warn('Aviso', { ... })
logger.error('Erro ocorreu', { ... })
```

### Regras Obrigatórias

1. **Use `getLogger()`** em Services
2. **Log info** para operações importantes (create, update, delete)
3. **Log error** para erros e exceções
4. **Inclua contexto** relevante (IDs, inputs, etc.)
5. **Não logue dados sensíveis** (senhas, tokens, dados pessoais)
6. **Use níveis apropriados**: `debug`, `info`, `warn`, `error`
7. **API Routes** não precisam logar manualmente - `createApiHandler` faz isso automaticamente

---

## 🔍 Tratamento de Erros no Cliente

### Em Hooks

```typescript
'use client'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar produto')
      }

      return await response.json()
    },
    onError: (error) => {
      // Tratar erro (ex: mostrar toast)
      console.error('Erro ao criar produto:', error)
    },
  })
}
```

### Em Componentes

```tsx
'use client'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  errors: {
    createProduct: 'Erro ao criar produto',
  },
} as const

export function CreateProductForm() {
  const createProduct = useCreateProduct()

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      await createProduct.mutateAsync(data)
      // Sucesso
    } catch (error) {
      // Erro já foi tratado pelo hook
      // Pode mostrar toast, mensagem, etc.
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      {createProduct.isError && (
        <div className="text-red-500">
          {createProduct.error?.message || CONTENT.errors.createProduct}
        </div>
      )}
    </form>
  )
}
```

---

## 🎯 Erros Customizados

### BaseError

```typescript
// lib/errors/base-error.ts
export abstract class BaseError extends Error {
  abstract statusCode: number
  abstract code: string

  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}
```

### Domain Errors

```typescript
// lib/errors/domain-errors.ts
export class NotFoundError extends BaseError {
  statusCode = 404
  code = 'NOT_FOUND'

  constructor(resource: string, identifier?: string) {
    super(`${resource} não encontrado${identifier ? `: ${identifier}` : ''}`, {
      resource,
      identifier,
    })
  }
}

export class ValidationError extends BaseError {
  statusCode = 400
  code = 'VALIDATION_ERROR'

  constructor(
    message: string,
    public field?: string
  ) {
    super(message, { field })
  }
}

export class ConflictError extends BaseError {
  statusCode = 409
  code = 'CONFLICT'

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context)
  }
}
```

---

## ✅ Checklist

### Ao tratar erros em Services

- [ ] Lance erros customizados (não retorne `{ success: false }`)
- [ ] Não capture erros - deixe propagar
- [ ] Mensagens em português e descritivas
- [ ] Inclua contexto quando possível

### Ao tratar erros em API Routes

- [ ] Use `createApiHandler` ou `createApiHandlerWithParams`
- [ ] Não capture erros manualmente - deixe o handler fazer
- [ ] Documente erros que podem ser lançados

### Ao fazer logging

- [ ] Use `getLogger()` em Services
- [ ] Log info para operações importantes
- [ ] Log error para erros e exceções
- [ ] Inclua contexto relevante
- [ ] Não logue dados sensíveis

---

## 📚 Próximos passos

- [Parte 3: API Routes e Services](03-api-routes-services.md)
- [Parte 4: Repositories e Validators](04-repositories-validators.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
