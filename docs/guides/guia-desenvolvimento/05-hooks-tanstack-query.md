# Parte 5: Hooks e TanStack Query

## 🎣 Custom hooks

### Quando Criar

- Toda operação que precisa ser chamada do cliente
- Lógica reutilizável de estado e efeitos colaterais
- Queries e mutations com TanStack Query

### ⚠️ Regra Fundamental

**Hooks DEVEM chamar API Routes, NÃO Supabase diretamente.**

Isso garante:

- ✅ Segurança (validação server-side)
- ✅ Consistência (mesma lógica em todos os lugares)
- ✅ Manutenibilidade (mudanças em um lugar só)

### Template Básico - Query (Como Deve Ser)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  errors: {
    fetchProducts: 'Erro ao buscar produtos',
  },
} as const

/**
 * Hook para buscar todos os produtos
 * Usa TanStack Query para cache e refetch automático
 * Chama API Route (não Supabase direto)
 */
export function useProducts() {
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/admin/products')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || CONTENT.errors.fetchProducts)
      }

      const { products: productsData } = await response.json()
      return productsData || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  return {
    products,
    isLoading,
    error,
    refetch,
  }
}
```

### Template para Mutations (Como Deve Ser)

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  errors: {
    createProduct: 'Erro ao criar produto',
  },
} as const

/**
 * Hook para criar um novo produto
 * Chama API Route (não Supabase direto)
 */
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
        throw new Error(errorData.error || CONTENT.errors.createProduct)
      }

      const { product } = await response.json()
      return product
    },
    onSuccess: () => {
      // Invalidar cache para refetch automático
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

### Template para Update (Como Deve Ser)

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Hook para atualizar um produto
 * Chama API Route (não Supabase direto)
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductInput }) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar produto')
      }

      const { product } = await response.json()
      return product
    },
    onSuccess: (_, variables) => {
      // Invalidar cache específico e lista
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] })
    },
  })
}
```

### Template para Delete (Como Deve Ser)

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Hook para deletar um produto
 * Chama API Route (não Supabase direto)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar produto')
      }
    },
    onSuccess: () => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

---

## 🔄 TanStack Query

### Configuração

**Localização**: `src/components/providers/query-provider.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Uso no Layout

```typescript
// src/app/layout.tsx
import { QueryProvider } from '@/components/providers/query-provider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
```

---

## 🎯 Hooks Específicos do Quitou

### usePaymentPolling

**Localização**: `src/hooks/use-payment-polling.ts`

**Nota**: Este hook pode acessar Supabase diretamente porque é polling de status (não modifica dados).

**Uso:**

```typescript
import { usePaymentPolling } from '@/hooks/use-payment-polling'

const { paymentInfo, isLoading, stopPolling } = usePaymentPolling({
  paymentId: 'pay_123',
  onSuccess: () => {
    // Callback quando pagamento confirmado
  },
})
```

### useProducts (Como Deve Ser)

**Localização**: `src/hooks/admin/use-products.ts`

**⚠️ IMPORTANTE**: Deve chamar API Route, não Supabase direto.

**Uso:**

```typescript
import { useProducts } from '@/hooks/admin/use-products'

const { products, isLoading, error } = useProducts()
```

**Implementação (Como Deve Ser):**

```typescript
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

### useOrders (Como Deve Ser)

**Localização**: `src/hooks/admin/use-orders.ts`

**⚠️ IMPORTANTE**: Deve chamar API Route, não Supabase direto.

**Uso:**

```typescript
import { useOrders } from '@/hooks/admin/use-orders'

const { orders, isLoading, error } = useOrders()
```

### useAdmin

**Localização**: `src/hooks/use-admin.ts`

**Nota**: Este hook pode usar `@quitou/core` diretamente (é um helper).

**Uso:**

```typescript
import { useIsAdmin } from '@/hooks/use-admin'

const { data: isAdmin, isLoading } = useIsAdmin()
```

---

## 📋 Padrões de Query Keys

### Estrutura Hierárquica

```typescript
// Lista
;['products']['orders']['payments'][
  // Item específico
  ('product', id)
][('order', id)][('payment', id)][
  // Com filtros
  ('products', { status: 'active' })
][('orders', { gateway: 'pagarme' })]
```

### Invalidar Cache

```typescript
// Invalidar toda a lista
queryClient.invalidateQueries({ queryKey: ['products'] })

// Invalidar item específico
queryClient.invalidateQueries({ queryKey: ['product', id] })

// Invalidar múltiplas queries
queryClient.invalidateQueries({ queryKey: ['products'] })
queryClient.invalidateQueries({ queryKey: ['orders'] })
```

---

## ✅ Regras Obrigatórias

1. **Sempre use `'use client'`** em hooks
2. **Use TanStack Query** para queries e mutations
3. **⚠️ Hooks DEVEM chamar API Routes** (não Supabase direto)
4. **Exceção**: Hooks de polling ou helpers podem acessar Supabase diretamente
5. **Invalide cache** após mutations
6. **Trate erros** adequadamente
7. **Use query keys consistentes** para cache eficiente
8. **Documente** o propósito do hook no JSDoc

---

## 🎯 Exemplos Práticos

### Exemplo 1: Hook de Produtos (Como Deve Ser)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface Product {
  id: string
  name: string
  ref: string
  active: boolean
  prices: Array<{
    id: string
    amount: number
    currency: string
  }>
}

/**
 * Hook para buscar produtos
 * Chama API Route (não Supabase direto)
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const response = await fetch('/api/admin/products')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar produtos')
      }

      const { products } = await response.json()
      return products as Product[]
    },
  })
}
```

### Exemplo 2: Hook de Dashboard Stats (Como Deve Ser)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Hook para buscar estatísticas do dashboard
 * Chama API Route (não Supabase direto)
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard/stats')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar estatísticas')
      }

      const { stats } = await response.json()
      return stats
    },
  })
}
```

---

## 📚 Próximos passos

- [Parte 2: Componentes e UI](02-componentes-ui.md)
- [Parte 3: API Routes](03-api-routes-services.md)
- [Parte 6: Error Handling](06-error-handling-logging.md)
