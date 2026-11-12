# Integração do Sistema de Pagamentos em Banco Existente

## Estrutura Recomendada

```
banco_principal/
├── auth.users (compartilhado)
├── public.profiles (sistema principal)
├── payments.* (sistema de pagamentos)
├── outros_schemas.* (outros módulos)
```

## Autenticação Compartilhada (Cookies)

### Opção 1: Mesmo Supabase Project (Recomendado) ✅

**Ambos os sistemas usam o mesmo Supabase:**

```env
# Sistema Principal
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AUTH_COOKIE_NAME=meu_projeto_auth_token

# Sistema de Pagamentos (mesmas variáveis)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AUTH_COOKIE_NAME=meu_projeto_auth_token  # MESMO NOME!
```

**Vantagens:**

- ✅ Cookies compartilhados automaticamente
- ✅ Sessão única entre sistemas
- ✅ Usuário logado em um sistema = logado em todos
- ✅ Mais simples de implementar

**Configuração de Cookie para Subdomínios:**

Se os sistemas estiverem em subdomínios diferentes (`app.seudominio.com` e `pagamentos.seudominio.com`):

```typescript
// src/supabase/client.ts
cookieOptions: {
  name: cookieName,
  path: '/',
  domain: '.seudominio.com',  // Compartilha entre subdomínios
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}
```

### Opção 2: Supabase Projects Diferentes

Se precisar usar Supabase projects diferentes, você pode:

**A) Compartilhar Token JWT entre sistemas:**

- Sistema principal obtém o token do Supabase
- Passa o token para o sistema de pagamentos via API
- Sistema de pagamentos valida o token

**B) Usar SSO (Single Sign-On):**

- Implementar OAuth/OIDC
- Ambos os sistemas validam o mesmo token SSO

## Passos para Integração

### 1. Aplicar Migrations do Payments

```bash
# No projeto de pagamentos
supabase migration up --db-url "postgresql://user:pass@host:port/database"
```

### 2. Configurar Cookies Compartilhados

**Mesmo domínio:**

```env
NEXT_PUBLIC_AUTH_COOKIE_NAME=meu_projeto_auth_token
```

**Subdomínios diferentes:**

```env
# Ambos os sistemas
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AUTH_COOKIE_NAME=meu_projeto_auth_token
NEXT_PUBLIC_COOKIE_DOMAIN=.seudominio.com  # Compartilha entre subdomínios
```

### 3. Verificar Conflitos

- ✅ Schema `payments` é isolado
- ✅ Funções usam `payments.function_name`
- ✅ Tabelas usam `payments.table_name`
- ✅ Não há conflitos com `public.*`

### 4. Compartilhar Auth

- Usuários criados em qualquer sistema funcionam em todos
- `payments.handle_new_user` cria profile automaticamente
- Pode desabilitar o trigger se já tiver outro sistema criando profiles

### 5. Integração de Profiles

**Opção A: Profiles Separados (Recomendado)**

- `public.profiles` → dados gerais do sistema principal
- `payments.profiles` → dados específicos de pagamento
- Ambos referenciam `auth.users.id`

**Opção B: Profile Único**

- Usar apenas `payments.profiles`
- Adicionar campos do sistema principal no `metadata` JSONB
- Ou criar views que unem dados

### 6. Admin Compartilhado

Se quiser compartilhar admins entre sistemas:

```sql
-- Criar função compartilhada (se não existir)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM payments.admin_users
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = payments, public, auth;
```

## Exemplo de Uso Multi-Sistema

```sql
-- Usuário existe em auth.users
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Profile no sistema principal
SELECT * FROM public.profiles WHERE id = 'user-uuid';

-- Profile no sistema de pagamentos
SELECT * FROM payments.profiles WHERE id = 'user-uuid';

-- Pagamentos do usuário
SELECT * FROM payments.pagarme_payments WHERE user_id = 'user-uuid';
```

## Migrations em Produção

```bash
# Aplicar apenas migrations do payments
supabase migration up --db-url $DATABASE_URL

# Verificar status
supabase migration list --db-url $DATABASE_URL
```

## Checklist de Integração

- [ ] Banco existente tem `auth.users` configurado
- [ ] Aplicar migrations do `payments` (idempotentes)
- [ ] **Configurar mesmo `NEXT_PUBLIC_AUTH_COOKIE_NAME` em ambos sistemas**
- [ ] Se subdomínios diferentes, configurar `domain` no cookie
- [ ] Verificar se há `public.profiles` ou outro schema de profiles
- [ ] Decidir: profiles separados ou unificado
- [ ] Configurar RLS se necessário para integração
- [ ] Testar criação de usuário e profile
- [ ] Testar login em um sistema e acesso no outro
- [ ] Testar pagamentos end-to-end

## Observações Importantes

1. **Migrations são idempotentes**: Podem ser aplicadas múltiplas vezes sem problemas
2. **Schema isolado**: Não interfere com outros sistemas
3. **Compartilhamento de auth**: Usuários únicos entre sistemas
4. **RLS independente**: Políticas do `payments` não afetam outros schemas
5. **Seed opcional**: Pode aplicar ou não o seed.sql dependendo do ambiente
6. **Cookie compartilhado**: Use o mesmo nome de cookie em ambos os sistemas para sessão única
