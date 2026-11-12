# Parte 8: Componentes DRY

## 🎯 Regra Simples: Textos no Topo do Arquivo

**TODOS os textos visíveis ao usuário DEVEM estar em variáveis**, independente da quantidade.

**Por quê?** Para facilitar tradução futura sem refatoração massiva e manter código organizado.

---

## 📋 Template Padrão

### ❌ ERRADO

```tsx
export function PaymentStatus() {
  return (
    <div>
      <h1>Aguardando pagamento</h1>
      <p>Seu pagamento está sendo processado</p>
      <button>Ver status</button>
    </div>
  )
}
```

### ✅ CORRETO

```tsx
'use client'

// ============================================================================
// CONTEÚDO - Centralizado no topo para fácil edição
// ============================================================================
const CONTENT = {
  title: 'Aguardando pagamento',
  subtitle: 'Seu pagamento está sendo processado',
  buttons: {
    viewStatus: 'Ver status',
  },
} as const

// ============================================================================
// COMPONENTE
// ============================================================================
export function PaymentStatus() {
  return (
    <div>
      <h1>{CONTENT.title}</h1>
      <p>{CONTENT.subtitle}</p>
      <button>{CONTENT.buttons.viewStatus}</button>
    </div>
  )
}
```

---

## 📝 Padrão para Dados/Configurações

### Textos e Conteúdo

```tsx
// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  // Títulos e textos principais
  title: 'Nome do componente',
  subtitle: 'Descrição do componente',
  description: 'Texto descritivo adicional',

  // Botões e ações
  buttons: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    submit: 'Enviar',
    pay: 'Pagar',
    retry: 'Tentar novamente',
  },

  // Estados do sistema
  states: {
    loading: 'Carregando...',
    error: 'Erro ao carregar',
    empty: 'Nenhum item encontrado',
    success: 'Operação realizada com sucesso',
    pending: 'Pendente',
    paid: 'Pago',
    cancelled: 'Cancelado',
  },

  // Mensagens de erro
  errors: {
    required: 'Campo obrigatório',
    invalid: 'Dados inválidos',
    notFound: 'Item não encontrado',
    paymentFailed: 'Pagamento falhou',
  },

  // Dados para renderização
  items: [
    { id: 'item1', label: 'Item 1', href: '/item1' },
    { id: 'item2', label: 'Item 2', href: '/item2' },
  ],
} as const
```

### Configurações Visuais

```tsx
// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
const CONFIG = {
  layout: {
    maxWidth: '4xl',
    padding: 'xl',
  },
  visual: {
    background: 'bg-gradient-to-br from-muted/20',
    titleSize: 'text-4xl sm:text-5xl md:text-6xl',
  },
} as const
```

### Configurações de Status de Pagamento

```tsx
// ============================================================================
// CONFIGURAÇÕES DE STATUS
// ============================================================================
const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  paid: {
    label: 'Pago',
    className: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-gray-100 text-gray-800',
    icon: XCircle,
  },
  refunded: {
    label: 'Reembolsado',
    className: 'bg-red-100 text-red-800',
    icon: RefreshCw,
  },
} as const

// Uso
const status = payment.status
const config = STATUS_CONFIG[status]

<span className={`px-2 py-1 rounded ${config.className}`}>
  <config.icon className="w-4 h-4" />
  {config.label}
</span>
```

---

## 🎨 Evitando Múltiplos `if` no className

### ❌ ERRADO - Múltiplos if no className

```tsx
<div
  className={`
    ${status === 'pending' ? 'bg-yellow-100' : ''}
    ${status === 'paid' ? 'bg-green-100' : ''}
    ${status === 'cancelled' ? 'bg-gray-100' : ''}
  `}
>
```

### ✅ CORRETO - Map de configurações

```tsx
// ============================================================================
// CONFIGURAÇÕES DE STATUS
// ============================================================================
const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
} as const

// Uso
<div className={STATUS_STYLES[status]}>
```

---

## 📋 Exemplos Práticos do Quitou

### Exemplo 1: Componente de Checkout

```tsx
'use client'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  form: {
    title: 'Dados do pagamento',
    subtitle: 'Preencha seus dados para continuar',

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

export function CheckoutForm() {
  // ... lógica do componente
  return (
    <form>
      <h2>{CONTENT.form.title}</h2>
      <p>{CONTENT.form.subtitle}</p>
      {/* ... campos do formulário */}
    </form>
  )
}
```

### Exemplo 2: Componente de Status de Pagamento

```tsx
'use client'

import { CheckCircle, Clock, XCircle } from 'lucide-react'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  status: {
    pending: {
      title: 'Aguardando pagamento',
      description: 'Seu pagamento está sendo processado',
      icon: Clock,
    },
    paid: {
      title: 'Pagamento confirmado',
      description: 'Seu pagamento foi confirmado com sucesso',
      icon: CheckCircle,
    },
    cancelled: {
      title: 'Pagamento cancelado',
      description: 'Seu pagamento foi cancelado',
      icon: XCircle,
    },
  },
} as const

export function PaymentStatus({ status }: { status: 'pending' | 'paid' | 'cancelled' }) {
  const config = CONTENT.status[status]
  const Icon = config.icon

  return (
    <div>
      <Icon className="w-8 h-8" />
      <h2>{config.title}</h2>
      <p>{config.description}</p>
    </div>
  )
}
```

### Exemplo 3: Componente Admin

```tsx
'use client'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  title: 'Dashboard',
  subtitle: 'Visão geral do sistema',

  cards: {
    products: 'Produtos',
    orders: 'Pedidos',
    revenue: 'Receita do Mês',
  },

  buttons: {
    newProduct: 'Novo produto',
    viewAll: 'Ver todos',
  },
} as const

export function AdminDashboard() {
  return (
    <div>
      <h1>{CONTENT.title}</h1>
      <p>{CONTENT.subtitle}</p>
      {/* ... cards e botões */}
    </div>
  )
}
```

---

## ✅ Regras Obrigatórias

1. **Sempre use `CONTENT`** para textos visíveis
2. **Centralize no topo** do arquivo
3. **Use `as const`** para type safety
4. **Organize por seções** (buttons, states, errors, etc.)
5. **Use maps/objetos** para configurações complexas
6. **Evite strings hardcoded** no JSX

---

## 📚 Próximos passos

- [Parte 2: Componentes e UI](02-componentes-ui.md)
- [Parte 5: Hooks e TanStack Query](05-hooks-tanstack-query.md)
