# Como Usar @quitou/admin como Biblioteca

## ⚠️ Importante

O `front-pagamento` foi configurado para funcionar como biblioteca importável, mas há algumas considerações importantes:

### ✅ O que funciona

- O projeto pode ser importado diretamente usando `file:` no package.json
- Componentes e hooks principais estão exportados em `src/index.ts`
- TypeScript reconhece os tipos corretamente

### ⚠️ Limitações

1. **Imports com `@/`**: O projeto usa imports relativos com alias `@/` que são resolvidos pelo Next.js. O projeto consumidor precisa configurar os mesmos paths no `tsconfig.json`.

2. **Dependências**: Todas as dependências do `front-pagamento` precisam estar instaladas no projeto consumidor.

3. **Tailwind CSS**: Se usar componentes com estilos Tailwind, o projeto consumidor precisa ter Tailwind configurado.

## 📦 Como Usar

### 1. Instalar como dependência local

No `package.json` do projeto consumidor:

```json
{
  "dependencies": {
    "@quitou/admin": "file:../front-pagamento"
  }
}
```

Depois execute:
```bash
pnpm install
```

### 2. Configurar paths no tsconfig.json

No projeto consumidor, adicione os paths no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@quitou/admin/*": ["../front-pagamento/src/*"]
    }
  }
}
```

### 3. Importar componentes

```typescript
// Importar componentes
import { PaymentStatus, CheckoutForm, usePaymentPolling } from '@quitou/admin'

// Ou importar diretamente do caminho
import { PaymentStatus } from '@quitou/admin/components/payment/payment-status'
```

## 🔧 Configuração Necessária no Projeto Consumidor

### Variáveis de Ambiente

O projeto consumidor precisa ter as mesmas variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_AUTH_COOKIE_NAME=
```

### Dependências Necessárias

Certifique-se de que o projeto consumidor tem todas as dependências:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.2",
    "@supabase/supabase-js": "^2.75.0",
    "@supabase/ssr": "^0.7.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "lucide-react": "^0.545.0",
    "zod": "^4.1.12"
  }
}
```

## 🚀 Exemplo de Uso

```typescript
'use client'

import { PaymentStatus, usePaymentPolling } from '@quitou/admin'
import { useState } from 'react'

export function MyCheckoutPage() {
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)

  const handleCreatePayment = async () => {
    const response = await fetch('/api/payments/pagarme/checkout', {
      method: 'POST',
      body: JSON.stringify({
        price_id: 'price-123',
        customer_info: {
          name: 'João Silva',
          email: 'joao@example.com',
          document: '12345678900',
        },
      }),
    })

    const data = await response.json()
    setPaymentId(data.payment_id)
    setPaymentLinkUrl(data.payment_link_url)
  }

  return (
    <PaymentStatus
      paymentId={paymentId}
      paymentLinkUrl={paymentLinkUrl}
      gateway="pagarme"
      productName="Produto Teste"
      amount={9990}
      onSuccess={() => {
        console.log('Pagamento confirmado!')
      }}
    />
  )
}
```

## 📝 Notas Importantes

1. **Next.js App Router**: O projeto foi desenvolvido para Next.js 16+ com App Router. Pode não funcionar corretamente em versões anteriores ou com Pages Router.

2. **Server Components**: Alguns componentes são `'use client'` e precisam ser usados apenas em Client Components.

3. **Supabase Client**: Os componentes usam `@/supabase/client` que precisa estar configurado no projeto consumidor.

## 🔄 Alternativa: Copiar Componentes

Se encontrar problemas com imports ou configuração, uma alternativa é copiar os componentes diretamente para o projeto consumidor:

```bash
# Copiar componentes de pagamento
cp -r front-pagamento/src/components/payment seu-projeto/src/components/

# Copiar hooks
cp front-pagamento/src/hooks/use-payment-polling.ts seu-projeto/src/hooks/
```

Depois ajuste os imports para usar os paths do seu projeto.

