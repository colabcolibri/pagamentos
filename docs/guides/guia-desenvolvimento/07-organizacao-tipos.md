# Parte 7: Organização de tipos

> **📋 Padrão**: Tipos devem ser organizados hierarquicamente, com tipos do domínio como fonte da verdade.

---

## 🎯 Princípios

### 1. Tipos do Domínio são a Fonte da Verdade

**Localização**: `src/lib/payments/{domain}/{domain}.types.ts`

```typescript
// ✅ CORRETO - Tipos do domínio
export interface Product {
  id: string
  name: string
  ref: string
  // ...
  prices?: Price[]
}

export interface Price {
  id: string
  ref: string
  // ...
}
```

**Regra**: Nunca redefina tipos do domínio em hooks ou componentes.

### 2. Hooks Importam Tipos do Domínio

**Localização**: `src/hooks/use-{feature}.ts`

```typescript
// ✅ CORRETO - Importa do domínio
import type { Price, Product } from '@/lib/payments/product'

// ✅ CORRETO - Estende tipos do domínio se necessário
export interface ProductWithPrice extends Product {
  prices: Price[] // Obrigatório (ao invés de opcional)
  mainPrice?: Price
  formattedPrice?: string
  formattedCashTag?: string
  formattedInstallmentsTag?: string
}

// ❌ ERRADO - Redefinir tipos do domínio
export interface Product {
  // ...
}
```

### 3. Componentes Usam Tipos do Domínio ou Tipos Estendidos

**Localização**: `src/components/{feature}/{component}.tsx`

```typescript
// ✅ CORRETO - Usa tipos do domínio
// ✅ CORRETO - Usa tipos estendidos do hook se necessário
import type { ProductWithPrice } from '@/hooks/use-product-price'
import type { Product } from '@/lib/payments/product'

interface CheckoutFormProps {
  product: Product
  // ...
}

interface ProductCardProps {
  product: ProductWithPrice
  // ...
}
```

---

## 📁 Estrutura de Tipos

### Hierarquia

```
src/lib/payments/{domain}/
  └── {domain}.types.ts          # Tipos do domínio (fonte da verdade)
      ├── Product
      ├── Price
      ├── CreateProductDTO
      └── UpdateProductDTO

src/hooks/
  └── use-{feature}.ts           # Tipos específicos do hook (estendem domínio)
      └── ProductWithPrice extends Product

src/components/
  └── {feature}/
      └── {component}.tsx        # Usa tipos do domínio ou hooks
```

---

## 🔄 Fluxo de Tipos

```
1. Domínio define tipos base
   └── src/lib/payments/product/product.types.ts

2. Hooks estendem se necessário
   └── src/hooks/use-product-price.ts
       └── ProductWithPrice extends Product

3. Componentes usam tipos do domínio ou hooks
   └── src/components/checkout/checkout-form.tsx
       └── import type { Product } from '@/lib/payments/product'
```

---

## ✅ Exemplos Corretos

### Exemplo 1: Hook com Tipo Estendido

```typescript
// src/hooks/use-product-price.ts
import type { Price, Product } from '@/lib/payments/product'

// Tipo específico do hook (estende domínio)
export interface ProductWithPrice extends Product {
  prices: Price[] // Obrigatório
  mainPrice?: Price
  formattedPrice?: string
  formattedCashTag?: string
  formattedInstallmentsTag?: string
}

export function useProductPrice(productRef: string) {
  // ...
}
```

### Exemplo 2: Componente Usando Tipo do Domínio

```typescript
// src/components/checkout/checkout-form.tsx
import type { Product } from '@/lib/payments/product'

interface CheckoutFormProps {
  product: Product
  priceId: string
  // ...
}
```

### Exemplo 3: Componente Usando Tipo do Hook

```typescript
// src/components/product/product-card.tsx
import type { ProductWithPrice } from '@/hooks/use-product-price'

interface ProductCardProps {
  product: ProductWithPrice
  // ...
}
```

---

## ❌ Erros Comuns

### Erro 1: Redefinir Tipos do Domínio

```typescript
// ✅ CORRETO
import type { Product } from '@/lib/payments/product'

// ❌ ERRADO
export interface Product {
  id: string
  name: string
  // ...
}
```

### Erro 2: Usar Tipos do Database Diretamente

```typescript
// ❌ ERRADO
import type { Database } from '@supabase/database.types'

// ✅ CORRETO
import type { Product } from '@/lib/payments/product'

type Product = Database['payments']['Tables']['products']['Row']
```

### Erro 3: Tipos Duplicados em Múltiplos Arquivos

```typescript
// ❌ ERRADO - Tipo definido em 3 lugares diferentes
// src/hooks/use-product-price.ts
export interface Product { ... }

// src/components/checkout/checkout-form.tsx
type Product = Database['payments']['Tables']['products']['Row']

// src/app/checkout/page.tsx
interface Product { ... }

// ✅ CORRETO - Tipo único no domínio
// src/lib/payments/product/product.types.ts
export interface Product { ... }
```

---

## 📋 Checklist

Ao criar ou modificar tipos:

- [ ] Tipo está no domínio (`src/lib/payments/{domain}/{domain}.types.ts`)?
- [ ] Hook importa do domínio ao invés de redefinir?
- [ ] Componente usa tipo do domínio ou hook?
- [ ] Não há tipos duplicados?
- [ ] Tipos estendidos estão apenas onde necessário?

---

## 🎯 Resumo

1. **Domínio = Fonte da Verdade**: Todos os tipos base ficam no domínio
2. **Hooks Estendem**: Se precisar de tipos específicos, estenda do domínio
3. **Componentes Consomem**: Usam tipos do domínio ou hooks
4. **Nunca Redefina**: Não crie tipos duplicados
