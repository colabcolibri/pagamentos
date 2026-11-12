# Parte 10: Cookies compartilhados entre sistemas

## 🎯 Quando Usar

Quando você precisa **integrar múltiplos sistemas** (ex: sistema principal + sistema de pagamentos) que compartilham a mesma autenticação do Supabase.

### Objetivo

Permitir que usuários façam login em um sistema e **automaticamente fiquem autenticados em outros sistemas** relacionados, criando experiência unificada.

---

## 🔗 Como Funciona

### Fluxo de Integração

```
Sistema A (sistema principal)
    ↓
Usuário faz login
    ↓
Cookie de autenticação é criado
    ↓
Sistema B (front-pagamento) lê o mesmo cookie
    ↓
Usuário está autenticado em ambos
```

### Componentes

1. **Mesmo Supabase**: Ambos os sistemas apontam para o mesmo projeto
2. **Mesmo nome de cookie**: Ambos usam `NEXT_PUBLIC_AUTH_COOKIE_NAME` com mesmo valor
3. **Domínio compartilhado**: Se necessário, configurar `NEXT_PUBLIC_COOKIE_DOMAIN`

---

## ⚙️ Configuração

### Variáveis de Ambiente Necessárias

Ambos os sistemas devem ter as **mesmas variáveis** configuradas:

```env
# Supabase (mesmo projeto em ambos os sistemas)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Nome do cookie (DEVE SER O MESMO em ambos os sistemas)
NEXT_PUBLIC_AUTH_COOKIE_NAME=quitou_auth_token

# Opcional: Se os sistemas estiverem em subdomínios diferentes
NEXT_PUBLIC_COOKIE_DOMAIN=.seudominio.com
```

### Template de Configuração

#### Sistema Principal

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_AUTH_COOKIE_NAME=quitou_auth_token
```

#### Sistema de Pagamentos (front-pagamento)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # MESMO Supabase!
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...            # MESMA Key!
NEXT_PUBLIC_AUTH_COOKIE_NAME=quitou_auth_token      # MESMO NOME!
```

---

## 🌐 Subdomínios

### Quando Usar

Se os sistemas estiverem em **subdomínios diferentes**:

- `app.seudominio.com` (sistema principal)
- `pagamentos.seudominio.com` (sistema de pagamentos)

### Configuração

Adicione em **ambos os sistemas**:

```env
NEXT_PUBLIC_COOKIE_DOMAIN=.seudominio.com
```

**Importante**: O ponto (`.`) no início permite que o cookie seja compartilhado entre subdomínios.

### Configuração no Código

**Localização**: `src/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'quitou_auth_token'
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      name: cookieName,
      domain: cookieDomain, // Compartilha entre subdomínios
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }
)
```

---

## ✅ Checklist de Integração

- [ ] Mesmo Supabase project configurado em ambos sistemas
- [ ] Mesmo `NEXT_PUBLIC_AUTH_COOKIE_NAME` em ambos sistemas
- [ ] Se subdomínios diferentes, configurar `NEXT_PUBLIC_COOKIE_DOMAIN`
- [ ] Testar login em um sistema e acesso no outro
- [ ] Verificar que cookies são compartilhados

---

## 📚 Próximos passos

- [Parte 1: Estrutura e Organização](01-estrutura-organizacao.md)
- [Parte 3: API Routes](03-api-routes-services.md)
