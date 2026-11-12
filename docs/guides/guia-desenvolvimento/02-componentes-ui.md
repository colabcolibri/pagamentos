# Parte 2: Componentes e UI

## 🎯 Padrão DRY para Componentes

**Regra Principal**: TODOS os textos visíveis ao usuário DEVEM estar em variáveis, independente da quantidade.

**Por quê?** Para facilitar tradução futura sem refatoração massiva e manter código organizado.

---

## 📋 Template Padrão

```tsx
'use client'

import { useState } from 'react'

// ============================================================================
// CONTEÚDO - Centralizado no topo para fácil edição
// ============================================================================
const CONTENT = {
  // Títulos e textos
  title: 'Nome do componente',
  subtitle: 'Descrição do componente',

  // Botões e ações
  buttons: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
  },

  // Estados do sistema
  states: {
    loading: 'Carregando...',
    error: 'Erro ao carregar',
    empty: 'Nenhum item encontrado',
    success: 'Operação realizada com sucesso',
  },

  // Dados para renderização (se necessário)
  items: [
    { id: 'item1', label: 'Item 1', href: '/item1' },
    { id: 'item2', label: 'Item 2', href: '/item2' },
  ],
} as const

// ============================================================================
// COMPONENTE
// ============================================================================
export default function ComponentName() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados condicionais - sempre com early return
  if (loading) {
    return <div className="p-4">{CONTENT.states.loading}</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">{CONTENT.states.error}</div>
  }

  return (
    <div>
      <h1>{CONTENT.title}</h1>
      <p>{CONTENT.subtitle}</p>

      <div className="flex gap-2">
        <button>{CONTENT.buttons.save}</button>
        <button>{CONTENT.buttons.cancel}</button>
      </div>

      {/* Lista de itens */}
      <ul>
        {CONTENT.items.map((item) => (
          <li key={item.id}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 📝 Padrões Específicos

### Formulários

```tsx
const CONTENT = {
  form: {
    title: 'Dados do pagamento',

    fields: {
      name: {
        label: 'Nome completo',
        placeholder: 'Digite seu nome',
        error: 'Nome é obrigatório',
      },
      email: {
        label: 'E-mail',
        placeholder: 'seu@email.com',
        error: 'E-mail inválido',
      },
      cpf: {
        label: 'CPF',
        placeholder: '000.000.000-00',
        error: 'CPF inválido',
      },
    },

    buttons: {
      submit: 'Continuar',
      cancel: 'Cancelar',
    },
  },
} as const

// Uso
<form>
  <h2>{CONTENT.form.title}</h2>

  {Object.entries(CONTENT.form.fields).map(([key, field]) => (
    <div key={key}>
      <label>{field.label}</label>
      <input placeholder={field.placeholder} />
      {errors[key] && <span className="text-red-500">{field.error}</span>}
    </div>
  ))}

  <button type="submit">{CONTENT.form.buttons.submit}</button>
  <button type="button">{CONTENT.form.buttons.cancel}</button>
</form>
```

### Estados de Pagamento

```tsx
const CONTENT = {
  statusLabels: {
    pending: 'Pendente',
    paid: 'Pago',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  },

  statusStyles: {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-red-100 text-red-800',
  },
} as const

// Uso
const status = payment.status
<span className={`px-2 py-1 rounded ${CONTENT.statusStyles[status]}`}>
  {CONTENT.statusLabels[status]}
</span>
```

---

## 🎨 Componentes shadcn/ui

### Adicionar novo componente

```bash
npx shadcn-ui@latest add [component-name]
```

**Exemplo:**

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

### Usar componentes

```tsx
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  buttons: {
    open: 'Abrir',
  },
  dialog: {
    content: 'Conteúdo do diálogo',
  },
} as const

export function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{CONTENT.buttons.open}</Button>
      </DialogTrigger>
      <DialogContent>
        <p>{CONTENT.dialog.content}</p>
      </DialogContent>
    </Dialog>
  )
}
```

### Customizar componentes

Não modifique os arquivos em `components/ui/` diretamente. Em vez disso:

1. **Via props className:**

```tsx
// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  buttons: {
    custom: 'Botão',
  },
} as const

<Button className='bg-custom-color'>{CONTENT.buttons.custom}</Button>
```

2. **Criar wrapper:**

```tsx
// components/custom-button.tsx
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CustomButton({ className, ...props }: ButtonProps) {
  return <Button className={cn('custom-styles', className)} {...props} />
}
```

---

## 📱 Responsividade

### Mobile-first com Tailwind

```tsx
// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  title: 'Título',
} as const

// ✅ Correto: mobile-first
<div className="
  p-4          // mobile: padding 1rem
  md:p-6       // tablet: padding 1.5rem
  lg:p-8       // desktop: padding 2rem
">
  <h1 className="
    text-2xl    // mobile: 1.5rem
    md:text-3xl // tablet: 1.875rem
    lg:text-4xl // desktop: 2.25rem
  ">
    {CONTENT.title}
  </h1>
</div>

// ❌ Evitar: desktop-first
<div className="p-8 md:p-6 sm:p-4">
```

### Breakpoints padrão

```typescript
// Tailwind breakpoints
sm: '640px'   // Small devices
md: '768px'   // Medium devices (tablets)
lg: '1024px'  // Large devices (desktops)
xl: '1280px'  // Extra large
2xl: '1536px' // 2X extra large
```

---

## 🎯 Componentes Específicos do Quitou

### PaymentStatus

Componente para exibir status de pagamento com polling automático.

**Localização**: `src/components/payment/payment-status.tsx`

**Uso:**

```tsx
import { PaymentStatus } from '@/components/payment/payment-status'

const CONTENT = {
  payment: {
    title: 'Aguardando pagamento',
  },
} as const

<PaymentStatus
  paymentId={paymentId}
  paymentLinkUrl={paymentLinkUrl}
  onSuccess={() => {
    // Callback quando pagamento confirmado
  }}
/>
```

### CheckoutForm

Formulário de checkout com validação.

**Localização**: `src/components/checkout/checkout-form.tsx`

**Uso:**

```tsx
import { CheckoutForm } from '@/components/checkout/checkout-form'

;<CheckoutForm
  priceId={priceId}
  onSuccess={(paymentId) => {
    // Redirecionar ou mostrar sucesso
  }}
/>
```

---

## ✅ Checklist ao criar componente

- [ ] Todos os textos estão em `CONTENT`
- [ ] Usa componentes shadcn/ui quando possível
- [ ] Responsivo (mobile-first)
- [ ] Estados de loading e error tratados
- [ ] Tipos TypeScript definidos
- [ ] Documentado (se necessário)

---

## 📚 Próximos passos

- [Parte 3: API Routes e Services](03-api-routes-services.md)
- [Parte 8: Componentes DRY](08-componentes-dry.md)
