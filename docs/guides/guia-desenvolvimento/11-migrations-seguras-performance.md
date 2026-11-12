# Parte 11: Migrations seguras e performáticas

> **Objetivo**: Este guia documenta as melhores práticas para criar migrations SQL seguras e performáticas no Supabase/PostgreSQL.

---

## 📋 Índice

1. [Segurança em Funções](#-segurança-em-funções)
2. [Performance em Políticas RLS](#-performance-em-políticas-rls)
3. [Evitando Recursão em RLS](#-evitando-recursão-em-rls)
4. [Índices e Performance](#-índices-e-performance)
5. [Boas Práticas Gerais](#-boas-práticas-gerais)
6. [Checklist de Migration](#-checklist-de-migration)

---

## 🔒 Segurança em Funções

### Problema: search_path mutável

**❌ ERRADO:**

```sql
create or replace function "payments"."is_admin_user"()
returns boolean
language plpgsql
as $$
begin
  return exists (
    select 1 from "payments"."admin_users"
    where id = auth.uid() and is_active = true
  );
end;
$$;
```

**✅ CORRETO:**

```sql
create or replace function "payments"."is_admin_user"()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from "payments"."admin_users"
    where id = (select auth.uid()) and is_active = true
  );
end;
$$;
```

### Por que é importante?

- **Vulnerabilidade de segurança**: Funções sem `search_path = ''` são vulneráveis a ataques de injeção de schema
- **Comportamento imprevisível**: O PostgreSQL pode resolver objetos de schemas inesperados
- **Supabase Linter**: Detecta e alerta sobre esse problema

### Regras de ouro:

1. **Sempre defina `set search_path = ''`** em funções
2. **Use `security definer`** quando a função precisa de privilégios elevados
3. **Qualifique explicitamente** todos os schemas e objetos (ex: `payments.table_name`, `auth.uid()`)

### Exemplo completo:

```sql
-- Função para verificar admin
create or replace function "payments"."is_admin_user"()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from "payments"."admin_users"
    where id = (select auth.uid())
    and is_active = true
  );
end;
$$;
```

---

## ⚡ Performance em Políticas RLS

### Problema: Reavaliação de auth.uid()

**❌ ERRADO (lento):**

```sql
create policy "orders_select_own" on "payments"."orders"
  for select
  using (user_id = auth.uid());
```

**✅ CORRETO (rápido):**

```sql
create policy "orders_select_own" on "payments"."orders"
  for select
  using (user_id = (select auth.uid()));
```

### Por que é importante?

- **`auth.uid()` direto**: É reavaliado para **cada linha** da tabela
- **`(select auth.uid())`**: É avaliado **uma vez** e reutilizado (initplan)
- **Impacto**: Em tabelas grandes, a diferença pode ser de **segundos para milissegundos**

### Padrão correto:

```sql
-- ✅ SEMPRE use (select auth.uid()) em políticas RLS
create policy "example_policy" on "payments"."table_name"
  for select
  using (
    user_id = (select auth.uid())
    or "payments"."is_admin_user"()
  );
```

---

## 🔄 Evitando Recursão em RLS

### Problema: Políticas RLS que chamam outras políticas RLS

**❌ ERRADO (recursão infinita):**

```sql
create policy "admin_users_select" on "payments"."admin_users"
  for select
  using (
    id = (select auth.uid())
    or exists (
      -- ❌ Isso causa recursão!
      select 1 from "payments"."admin_users"
      where id = (select auth.uid())
    )
  );
```

**✅ CORRETO (usa função):**

```sql
create policy "admin_users_select" on "payments"."admin_users"
  for select
  using (
    id = (select auth.uid())
    or "payments"."is_admin_user"()
  );
```

### Por que é importante?

- **Recursão infinita**: Políticas que consultam a mesma tabela causam loop
- **Solução**: Use funções `SECURITY DEFINER` que bypassam RLS

---

## 📊 Índices e Performance

### Índices Essenciais

**Tabelas com muitas queries:**

```sql
-- Índice em user_id (muito usado em RLS)
create index idx_orders_user_id on "payments"."orders"(user_id);

-- Índice em status (usado em filtros)
create index idx_orders_status on "payments"."orders"(status);

-- Índice composto
create index idx_orders_user_status on "payments"."orders"(user_id, status);
```

### GIN Index para JSONB

**Para arrays e objetos JSONB:**

```sql
-- Índice GIN para payment_methods (array)
create index idx_products_payment_methods on "payments"."products"
using gin(payment_methods);

-- Permite queries rápidas:
-- WHERE payment_methods @> '["pix"]'
```

---

## ✅ Boas Práticas Gerais

### 1. Sempre use schema explícito

```sql
-- ✅ Correto
select * from "payments"."products"

-- ❌ Errado
select * from products
```

### 2. Use transações quando necessário

```sql
begin;

-- Múltiplas operações relacionadas
create table "payments"."new_table" (...);
create index ...;
create policy ...;

commit;
```

### 3. Documente migrations complexas

```sql
-- Migration: Adiciona campo payment_methods em products
-- Data: 2025-01-15
-- Descrição: Permite controlar quais métodos de pagamento são permitidos
```

### 4. Teste migrations em desenvolvimento

```bash
# Aplicar migration localmente
supabase migration up

# Verificar se funcionou
supabase db diff
```

---

## 📋 Checklist de Migration

Antes de criar uma migration, verifique:

- [ ] Funções têm `set search_path = ''`
- [ ] Funções usam `security definer` quando necessário
- [ ] Políticas RLS usam `(select auth.uid())` em vez de `auth.uid()`
- [ ] Não há recursão em políticas RLS
- [ ] Índices criados para colunas frequentemente consultadas
- [ ] Schema explícito em todas as referências
- [ ] Migration testada localmente
- [ ] Documentação adicionada se necessário

---

## 📚 Próximos passos

- [Parte 1: Estrutura e Organização](01-estrutura-organizacao.md)
- [Parte 3: API Routes](03-api-routes-services.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
