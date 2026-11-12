# Planejamento - Páginas Admin

## Estrutura Geral

### Layout Compartilhado

- **Header comum**: Reutilizável em todas as páginas admin
- **Componentes**:
  - `SidebarTrigger` (abrir/fechar sidebar)
  - Título da página
  - Subtítulo/descrição
  - Avatar do admin
  - Ações específicas da página (ex: botão "Novo produto")

**Decisão**: Criar componente `<AdminPageHeader>` e usá-lo em todas as páginas.

---

## Páginas a Criar

### 1. **Dashboard** ✅ (Completo)

- **URL**: `/admin`
- **Objetivo**: Visão geral com métricas principais
- **Conteúdo**:
  - Cards com estatísticas (produtos, pagamentos, orders, etc)
  - Links para outras páginas
- **Status**: ✅ Pronto

---

### 2. **Produtos** (Mais simples - COMEÇAR POR AQUI)

- **URL**: `/admin/products`
- **Objetivo**: Listar todos os produtos com seus preços
- **Conteúdo**:
  - Tabela com:
    - Nome do produto
    - Referência
    - Status (ativo/inativo)
    - Quantidade de preços
    - Data de criação
  - Expandir linha para ver preços
  - Badge para status
  - Link para editar (futuro)
- **Dados necessários**:
  - `products` (nome, ref, active, description)
  - `prices` (valor, recurring, installments)
- **Hook**: `useProducts()` ✅ já criado
- **Complexidade**: ⭐ Baixa (apenas leitura, sem formulários)

---

### 3. **Orders** (Simples)

- **URL**: `/admin/orders`
- **Objetivo**: Ver todos os pedidos do sistema
- **Conteúdo**:
  - Tabela com:
    - ID do pedido
    - Usuário (email)
    - Produto
    - Status (pending, paid, cancelled, refunded)
    - Valor
    - Gateway (Pagar.me / Asaas)
    - Data de criação
  - Filtros:
    - Status
    - Gateway
    - Data
  - Badge colorido para cada status
  - Link para ver detalhes
- **Dados necessários**:
  - `orders` (user_id, product_id, status, amount_cents, payment_gateway)
  - JOIN com `products` e `auth.users` (email)
- **Hook**: `useOrders()` ✅ já criado (precisa melhorar para incluir JOINs)
- **Complexidade**: ⭐⭐ Média (precisa de filtros e JOINs)

---

### 4. **Pagamentos** (Média)

- **URL**: `/admin/payments`
- **Objetivo**: Ver todos os pagamentos (Pagar.me + Asaas)
- **Conteúdo**:
  - Tabela unificada com:
    - ID do pagamento
    - Gateway (Pagar.me / Asaas)
    - Usuário
    - Status
    - Método (credit_card, pix, boleto)
    - Valor
    - Data de criação
    - Data de pagamento
  - Filtros:
    - Gateway
    - Status
    - Método de pagamento
    - Data
  - Ações:
    - Ver detalhes
    - Copiar ID
    - Link externo (Pagar.me/Asaas dashboard)
- **Dados necessários**:
  - `pagarme_payments` (status, amount_cents, payment_method, etc)
  - `asaas_payments` (status, amount_cents, billing_type, etc)
  - Unificar em uma única tabela
- **Hook**: `usePayments()` ✅ já criado (precisa melhorar estrutura)
- **Complexidade**: ⭐⭐⭐ Média-Alta (união de 2 tabelas, normalização)

---

### 5. **Webhooks** (Média)

- **URL**: `/admin/webhooks`
- **Objetivo**: Monitorar logs de webhooks recebidos
- **Conteúdo**:
  - Tabela com:
    - ID
    - Provider (pagarme / asaas)
    - Evento (order.created, order.paid, etc)
    - Status de processamento (received, success, error)
    - Data
  - Filtros:
    - Provider
    - Tipo de evento
    - Status
    - Data
  - Expandir linha para ver:
    - Payload completo (JSON)
    - Headers
    - Log de processamento
  - Badge colorido para status
- **Dados necessários**:
  - `webhook_events` (provider, event_type, payload, processing_status, processing_log)
- **Hook**: `useWebhooks()` ✅ já criado
- **Complexidade**: ⭐⭐ Média (precisa renderizar JSON de forma bonita)

---

### 6. **Assinaturas** (Simples)

- **URL**: `/admin/subscriptions`
- **Objetivo**: Ver assinaturas ativas/canceladas
- **Conteúdo**:
  - Tabela com:
    - ID
    - Usuário (email)
    - Produto
    - Status (active, cancelled, expired)
    - Valor
    - Próxima cobrança
    - Data de início
  - Filtros:
    - Status
  - Badge para status
- **Dados necessários**:
  - `subscriptions` (user_id, product_id, status, next_billing_date)
  - JOIN com `products` e `auth.users`
- **Hook**: Criar `useSubscriptions()`
- **Complexidade**: ⭐⭐ Média (precisa de JOINs)

---

### 7. **Administradores** (Simples)

- **URL**: `/admin/admins`
- **Objetivo**: Ver lista de admins
- **Conteúdo**:
  - Tabela com:
    - Nome
    - Email
    - Role (admin / super_admin)
    - Status (ativo/inativo)
    - Data de criação
  - Badge para role
  - (Futuro: adicionar/remover admins)
- **Dados necessários**:
  - `admin_users` (name, email, role, is_active)
- **Hook**: Criar `useAdmins()`
- **Complexidade**: ⭐ Baixa (apenas leitura)

---

## Componentes Compartilhados a Criar

### 1. `AdminPageHeader`

```tsx
interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode // Botão de ação (ex: "Novo produto")
}
```

### 2. `DataTable` (Genérico)

- Tabela reutilizável com:
  - Skeleton loading
  - Paginação
  - Ordenação
  - Empty state
  - Expansão de linhas (opcional)

### 3. `StatusBadge`

- Badge colorido baseado em status
- Mapear cores por tipo de status

### 4. `FilterBar`

- Barra de filtros reutilizável
- Suportar múltiplos tipos de filtro

---

## Ordem de Implementação

### Fase 1 (Básico)

1. ✅ Dashboard (pronto)
2. 🚀 **Produtos** (começar aqui - mais simples)
3. Administradores (simples, apenas leitura)

### Fase 2 (Intermediário)

4. Orders (adicionar filtros)
5. Webhooks (renderizar JSON)
6. Assinaturas (adicionar JOINs)

### Fase 3 (Avançado)

7. Pagamentos (união de tabelas, normalização)

---

## Padrões de Código

### Estrutura de arquivo da página

```tsx
'use client'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { DataTable } from '@/components/admin/data-table'
import { useXXX } from '@/hooks/admin'

export default function XXXPage() {
  const { data, isLoading } = useXXX()

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      <AdminPageHeader title="Título" subtitle="Descrição" />

      <main className="flex-1 p-6">
        <DataTable data={data} isLoading={isLoading} columns={columns} />
      </main>
    </div>
  )
}
```

### Hook padrão

```tsx
import { useQuery } from '@tanstack/react-query'

export function useXXX() {
  return useQuery({
    queryKey: ['admin', 'xxx'],
    queryFn: fetchXXX,
    staleTime: 5 * 60 * 1000,
  })
}
```

---

## Observações Técnicas

1. **Header compartilhado**: Extrair o header atual do dashboard para um componente reutilizável
2. **Skeleton loading**: Sempre mostrar skeleton enquanto carrega
3. **Error states**: Sempre tratar erros de forma visual
4. **Empty states**: Mensagem quando não há dados
5. **Responsividade**: Tabelas devem funcionar em mobile (cards em vez de table?)
6. **Performance**: Usar virtualização se tiver muitos dados (react-window)

---

## Decisões de Design

- **Cores de status**:
  - `pending`: amarelo
  - `paid` / `active`: verde
  - `cancelled`: cinza
  - `refunded` / `error`: vermelho
  - `expired`: laranja

- **Ícones**: Lucide React (já estamos usando)

- **Tabelas**: Shadcn Table component como base

- **Paginação**: Implementar no backend (Supabase range) para escalar
