# Painel Administrativo

## 🎯 Visão Geral

O painel administrativo do Quitou permite gerenciar produtos, visualizar pedidos, acompanhar pagamentos e configurar o sistema.

---

## 🔐 Autenticação e Autorização

### Verificação de Admin

**Server-side (obrigatório):**

```typescript
// src/app/admin/layout.tsx
const supabase = await createClient()
const { data: isAdmin } = await supabase.rpc('is_admin_user')

if (!isAdmin) {
  redirect('/unauthorized')
}
```

**Client-side (apenas para UI):**

```typescript
// src/hooks/use-admin.ts
const { data: isAdmin } = useIsAdmin()
```

### Tabela de Admins

**Localização**: `payments.admin_users`

**Estrutura:**

```sql
CREATE TABLE payments.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Roles:**

- `admin` - Administrador comum
- `super_admin` - Super administrador (pode criar outros admins)

---

## 📊 Páginas do Admin

### Dashboard

**URL**: `/admin`

**Funcionalidades:**

- Estatísticas gerais (produtos, pedidos, receita)
- Cards com métricas principais
- Links para outras páginas

**Componente**: `src/app/admin/page.tsx`

### Produtos

**URL**: `/admin/products`

**Funcionalidades:**

- Listar todos os produtos
- Ver preços de cada produto
- Editar produtos
- Configurar políticas de reembolso
- Configurar emails

**Componente**: `src/app/admin/products/page.tsx`

**Hook**: `useProducts()`

### Pedidos

**URL**: `/admin/orders`

**Funcionalidades:**

- Listar todos os pedidos
- Filtrar por status, gateway, data
- Ver detalhes do pedido
- Reenviar emails

**Componente**: `src/app/admin/orders/page.tsx`

**Hook**: `useOrders()`

---

## 🎨 Componentes Admin

### AdminPageHeader

**Localização**: `src/components/admin/admin-page-header.tsx`

**Uso:**

```tsx
<AdminPageHeader
  title="Produtos"
  subtitle="Gerencie seus produtos"
  actions={<Button>Novo produto</Button>}
/>
```

### AdminPageLayout

**Localização**: `src/components/admin/admin-page-layout.tsx`

**Uso:**

```tsx
<AdminPageLayout>
  <AdminPageHeader title="Dashboard" />
  {/* Conteúdo da página */}
</AdminPageLayout>
```

### AppSidebar

**Localização**: `src/components/admin/app-sidebar.tsx`

**Funcionalidades:**

- Navegação principal
- Links para todas as páginas admin
- Avatar do admin
- Logout

---

## 🔧 Hooks Admin

### useProducts

**Localização**: `src/hooks/admin/use-products.ts`

**Uso:**

```typescript
const { products, isLoading, error } = useProducts()
```

### useOrders

**Localização**: `src/hooks/admin/use-orders.ts`

**Uso:**

```typescript
const { orders, isLoading, error } = useOrders()
```

### useDashboardStats

**Localização**: `src/hooks/admin/use-dashboard-stats.ts`

**Uso:**

```typescript
const { data: stats, isLoading } = useDashboardStats()
```

### useIsAdmin

**Localização**: `src/hooks/use-admin.ts`

**Uso:**

```typescript
const { data: isAdmin, isLoading } = useIsAdmin()
```

---

## 🛡️ Segurança

### Proteção de Rotas

**Middleware:**

```typescript
// src/proxy.ts (Next.js 16)
if (pathname.startsWith('/admin')) {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin_user')

  if (!isAdmin) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
}
```

**Layout:**

```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin_user')

  if (!isAdmin) {
    redirect('/unauthorized')
  }

  return <>{children}</>
}
```

### Proteção de API Routes

```typescript
// src/app/api/admin/*/route.ts
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_admin_user')

  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // ... lógica da rota
}
```

---

## 🔒 Segurança Detalhada

### Verificações Server-Side Implementadas

**✅ Páginas (Server Components):**
- `/admin/layout.tsx` - Verifica admin **server-side** antes de renderizar
- `/profile/page.tsx` - Verifica admin **server-side** e redireciona se necessário
- `proxy.ts` - Verifica admin **server-side** antes de redirecionar

**✅ Rotas de API:**
- `/api/admin/*` - Todas verificam admin **server-side** antes de processar
- Verificação dupla: autenticação + verificação de admin na tabela `admin_users`

**✅ Banco de Dados (RLS):**
- `payments.admin_users` tem RLS habilitado
- INSERT: Apenas `super_admin` pode criar novos admins
- UPDATE: Apenas `super_admin` pode atualizar admins
- DELETE: Apenas `super_admin` pode deletar admins
- SELECT: Apenas admins podem ver outros admins

**✅ Funções do Banco:**
- `payments.is_admin_user()` - Verifica usando `auth.uid()` (não pode ser falsificado)
- `payments.is_super_admin()` - Verifica role usando `auth.uid()`
- Funções usam `SECURITY DEFINER` com `search_path` seguro

### Arquitetura de Segurança

**Tabelas Separadas:**

- `payments.profiles` (usuários comuns):
  - ❌ **NÃO tem campo `is_admin`**
  - ✅ Usuários podem atualizar seus próprios dados (name, phone, etc)
  - ✅ RLS permite UPDATE apenas do próprio registro

- `payments.admin_users` (admins - tabela separada):
  - ✅ Contém `id`, `email`, `name`, `role`, `is_active`
  - ✅ RLS bloqueia INSERT/UPDATE/DELETE exceto para `super_admin`
  - ✅ SELECT apenas para admins

**Verificação de Admin:**

O sistema verifica admin consultando `payments.admin_users`, **NÃO** `payments.profiles`:

```sql
-- Função que verifica admin
CREATE FUNCTION payments.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Proteções Contra Auto-Promoção

**1. RLS Policy em `admin_users`:**

```sql
-- INSERT: Apenas super_admin pode criar
CREATE POLICY admin_users_insert_policy
ON payments.admin_users
FOR INSERT
WITH CHECK (payments.is_super_admin());

-- UPDATE: Apenas super_admin pode atualizar
CREATE POLICY admin_users_update_policy
ON payments.admin_users
FOR UPDATE
USING (payments.is_super_admin());
```

**2. Sem Rotas de API para Criar/Atualizar Admin:**
- ✅ Nenhuma rota `/api/admin/users` encontrada
- ✅ Apenas `super_admin` pode criar admins via SQL direto

### Riscos Mitigados

**✅ Manipulação de Token JWT:**
- Verificação sempre usa `auth.uid()` do Supabase (validado server-side)
- Não é possível falsificar `auth.uid()` sem comprometer o Supabase

**✅ Requisições Diretas à API:**
- Todas as rotas `/api/admin/*` verificam admin **server-side**
- Mesmo que burle frontend, API bloqueia

**✅ Acesso Direto ao Banco:**
- RLS policies bloqueiam INSERT/UPDATE em `admin_users` exceto para `super_admin`
- RLS é aplicado no nível do banco

**✅ Client-Side Verification:**
- Hook `useIsAdmin()` é apenas para UI
- Todas as ações críticas verificam server-side

### Checklist de Segurança

- [x] Verificação server-side em todas as páginas admin
- [x] Verificação server-side em todas as rotas de API admin
- [x] RLS policies no banco de dados
- [x] Funções do banco usam `auth.uid()` (não pode ser falsificado)
- [x] Não há rotas de API para criar/atualizar admin_users
- [x] Middleware verifica admin antes de redirecionar
- [x] Layout admin verifica admin antes de renderizar
- [x] Tabelas separadas (`profiles` vs `admin_users`)
- [x] `profiles` não tem campo `is_admin`

### Conclusão

**O sistema está SEGURO** contra:
- ✅ Manipulação de tokens JWT
- ✅ Requisições diretas à API
- ✅ Acesso direto ao banco (via RLS)
- ✅ Auto-promoção a admin
- ✅ Bypass de verificações client-side

**Única forma de criar admin**: Um `super_admin` existente deve inserir manualmente na tabela `payments.admin_users` via SQL ou interface administrativa protegida.

---

## 📋 Funcionalidades Principais

### Gerenciamento de Produtos

- Criar produtos
- Editar produtos
- Configurar preços
- Definir métodos de pagamento
- Configurar políticas de reembolso
- Configurar emails

### Visualização de Pedidos

- Listar todos os pedidos
- Filtrar por status
- Filtrar por gateway
- Filtrar por data
- Ver detalhes do pedido
- Reenviar emails

### Estatísticas

- Total de produtos
- Total de pedidos
- Receita do mês
- Pagamentos por gateway

---

## ✅ Checklist de Implementação

- [ ] Layout admin criado
- [ ] Sidebar de navegação
- [ ] Dashboard com estatísticas
- [ ] Página de produtos
- [ ] Página de pedidos
- [ ] Proteção de rotas
- [ ] Hooks customizados
- [ ] Componentes reutilizáveis

---

## 📚 Próximos Passos

- [Arquitetura](02-arquitetura.md)
- [Sistema de Pagamentos](03-pagamentos.md)
- [Fluxo de pedidos e pagamentos (criação e exclusão)](fluxo-pedidos-pagamentos.md)
- [Visão Geral](01-visao-geral.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
