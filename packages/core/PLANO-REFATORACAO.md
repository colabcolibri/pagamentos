# Plano de refatoração - @quitou/core

> **Objetivo**: Refatorar o pacote `@quitou/core` para seguir os padrões documentados no guia de desenvolvimento, garantindo consistência com o `front-pagamento` e melhorando manutenibilidade, testabilidade e organização do código.

---

## 📋 Análise da situação atual

### Estrutura atual

```
packages/core/src/
├── email.ts                          # ❌ Deveria estar em services/email
├── helpers/
│   ├── auth.ts                       # ✅ OK
│   ├── checkout.ts                    # ✅ OK (mas pode melhorar)
│   └── webhook-logger.ts              # ✅ OK
├── routes/
│   ├── asaas-checkout.ts              # ⚠️ Precisa melhorar error handling
│   ├── asaas-webhook.ts               # ⚠️ Precisa melhorar error handling
│   ├── pagarme-checkout.ts            # ⚠️ Precisa melhorar error handling
│   └── pagarme-webhook.ts             # ⚠️ Precisa melhorar error handling
├── services/
│   ├── admin.ts                       # ⚠️ Precisa seguir padrão Repository/Service
│   ├── asaas.ts                       # ⚠️ Precisa seguir padrão Repository/Service
│   ├── pagarme.ts                     # ⚠️ Precisa seguir padrão Repository/Service
│   ├── email-adapter.ts               # ✅ OK (Adapter Pattern)
│   └── email/                         # ✅ OK
├── types/
│   ├── index.ts                       # ⚠️ Precisa organizar melhor
│   ├── routes.ts                      # ✅ OK
│   └── supabase-types.ts              # ✅ OK
├── utils/
│   ├── checkout-utils.ts              # ✅ OK
│   └── payment-methods.ts             # ✅ OK
└── validators/
    └── index.ts                       # ⚠️ Precisa organizar melhor
```

### Problemas identificados

1. **Falta de separação por domínio**: Services misturam lógica de negócio com acesso a dados
2. **Sem Repository Pattern**: Acesso direto ao Supabase nos services
3. **Error handling inconsistente**: Não usa erros customizados estruturados
4. **Logging inconsistente**: Não usa logger estruturado
5. **Validators desorganizados**: Não seguem padrão por domínio
6. **Types desorganizados**: Misturados sem organização clara
7. **Falta de Factory Pattern**: Services criados diretamente sem factory
8. **Falta de validação consistente**: Validações espalhadas e inconsistentes

---

## 🎯 Objetivos da refatoração

1. **Organizar por domínio**: Cada domínio (payment, admin, email) com sua própria estrutura
2. **Implementar Repository Pattern**: Separar acesso a dados da lógica de negócio
3. **Implementar Service Pattern**: Services com lógica de negócio, recebendo repositories via DI
4. **Error handling estruturado**: Erros customizados e tratamento centralizado
5. **Logging estruturado**: Logger consistente em todos os services
6. **Validators organizados**: Validators por domínio com Zod
7. **Factory Pattern**: Factory para criar services com dependências
8. **Type safety**: Tipos bem definidos e organizados

---

## 📐 Estrutura proposta

```
packages/core/src/
├── errors/                            # 🆕 Error handling estruturado
│   ├── base-error.ts
│   ├── domain-errors.ts
│   ├── error-handler.ts
│   └── index.ts
├── logger/                            # 🆕 Logging estruturado
│   ├── logger.interface.ts
│   ├── console-logger.ts
│   ├── logger-factory.ts
│   └── index.ts
├── helpers/                           # ✅ Manter (melhorar se necessário)
│   ├── auth.ts
│   ├── checkout.ts
│   └── webhook-logger.ts
├── routes/                            # ⚠️ Melhorar error handling
│   ├── asaas-checkout.ts
│   ├── asaas-webhook.ts
│   ├── pagarme-checkout.ts
│   └── pagarme-webhook.ts
├── payments/                          # 🆕 Domínio de pagamentos
│   ├── repositories/
│   │   ├── payment.repository.interface.ts
│   │   ├── supabase-payment.repository.ts
│   │   ├── order.repository.interface.ts
│   │   └── supabase-order.repository.ts
│   ├── services/
│   │   ├── pagarme.service.ts          # Refatorar de services/pagarme.ts
│   │   └── asaas.service.ts            # Refatorar de services/asaas.ts
│   ├── validators/
│   │   ├── checkout.validators.ts
│   │   └── payment.validators.ts
│   ├── types/
│   │   ├── payment.types.ts
│   │   └── order.types.ts
│   └── index.ts
├── admin/                             # 🆕 Domínio administrativo
│   ├── repositories/
│   │   ├── admin-user.repository.interface.ts
│   │   └── supabase-admin-user.repository.ts
│   ├── services/
│   │   └── admin.service.ts            # Refatorar de services/admin.ts
│   ├── validators/
│   │   └── admin.validators.ts
│   ├── types/
│   │   └── admin.types.ts
│   └── index.ts
├── email/                             # 🆕 Domínio de email (já existe, reorganizar)
│   ├── services/
│   │   ├── email-adapter.ts           # Mover de services/email-adapter.ts
│   │   └── email.service.ts           # 🆕 Service com lógica de negócio
│   ├── types/
│   │   └── email.types.ts
│   └── index.ts
├── factories/                         # 🆕 Factory Pattern
│   ├── service-factory.ts
│   └── index.ts
├── utils/                             # ✅ Manter
│   ├── checkout-utils.ts
│   └── payment-methods.ts
└── index.ts                           # ⚠️ Reorganizar exports
```

---

## 🔄 Plano de execução

### Fase 1: Infraestrutura base (Fundação)

#### 1.1 Error handling
- [ ] Criar `errors/base-error.ts` com classe base abstrata
- [ ] Criar `errors/domain-errors.ts` com erros customizados:
  - `NotFoundError`
  - `ValidationError`
  - `UnauthorizedError`
  - `ForbiddenError`
  - `ConflictError`
  - `DatabaseError`
- [ ] Criar `errors/error-handler.ts` com `handleError()` e `createErrorHandler()`
- [ ] Criar `errors/index.ts` com exports públicos

**Arquivos a criar:**
- `src/errors/base-error.ts`
- `src/errors/domain-errors.ts`
- `src/errors/error-handler.ts`
- `src/errors/index.ts`

**Referência:** `front-pagamento/src/lib/errors/`

---

#### 1.2 Logging estruturado
- [ ] Criar `logger/logger.interface.ts` com interface do logger
- [ ] Criar `logger/console-logger.ts` com implementação
- [ ] Criar `logger/logger-factory.ts` com factory
- [ ] Criar `logger/index.ts` com exports públicos

**Arquivos a criar:**
- `src/logger/logger.interface.ts`
- `src/logger/console-logger.ts`
- `src/logger/logger-factory.ts`
- `src/logger/index.ts`

**Referência:** `front-pagamento/src/lib/logger/`

---

### Fase 2: Domínio de pagamentos

#### 2.1 Types e DTOs
- [ ] Criar `payments/types/payment.types.ts` com:
  - `Payment` (interface)
  - `CreatePaymentDTO`
  - `UpdatePaymentDTO`
  - `PaymentQueryOptions`
- [ ] Criar `payments/types/order.types.ts` com:
  - `Order` (interface)
  - `CreateOrderDTO`
  - `UpdateOrderDTO`
  - `OrderQueryOptions`
- [ ] Mover tipos relacionados de `types/index.ts` para domínios específicos

**Arquivos a criar:**
- `src/payments/types/payment.types.ts`
- `src/payments/types/order.types.ts`

---

#### 2.2 Repositories
- [ ] Criar `payments/repositories/payment.repository.interface.ts` com interface
- [ ] Criar `payments/repositories/supabase-payment.repository.ts` com implementação
- [ ] Criar `payments/repositories/order.repository.interface.ts` com interface
- [ ] Criar `payments/repositories/supabase-order.repository.ts` com implementação
- [ ] Extrair lógica de acesso a dados dos services atuais

**Arquivos a criar:**
- `src/payments/repositories/payment.repository.interface.ts`
- `src/payments/repositories/supabase-payment.repository.ts`
- `src/payments/repositories/order.repository.interface.ts`
- `src/payments/repositories/supabase-order.repository.ts`

**Referência:** `front-pagamento/src/lib/payments/order/`

---

#### 2.3 Services
- [ ] Refatorar `services/pagarme.ts` → `payments/services/pagarme.service.ts`:
  - Remover acesso direto ao Supabase
  - Receber repositories via construtor (DI)
  - Adicionar error handling com erros customizados
  - Adicionar logging estruturado
- [ ] Refatorar `services/asaas.ts` → `payments/services/asaas.service.ts`:
  - Mesmas melhorias do PagarmeService
- [ ] Criar `payments/services/payment.service.ts` (se necessário para lógica compartilhada)

**Arquivos a modificar:**
- `src/services/pagarme.ts` → `src/payments/services/pagarme.service.ts`
- `src/services/asaas.ts` → `src/payments/services/asaas.service.ts`

---

#### 2.4 Validators
- [ ] Criar `payments/validators/checkout.validators.ts` com validators Zod
- [ ] Criar `payments/validators/payment.validators.ts` com validators Zod
- [ ] Mover `validators/index.ts` para `payments/validators/`
- [ ] Criar `payments/validators/index.ts` com exports

**Arquivos a criar:**
- `src/payments/validators/checkout.validators.ts`
- `src/payments/validators/payment.validators.ts`
- `src/payments/validators/index.ts`

---

#### 2.5 Index do domínio
- [ ] Criar `payments/index.ts` exportando:
  - Types
  - Repositories (interfaces e implementações)
  - Services
  - Validators

**Arquivos a criar:**
- `src/payments/index.ts`

---

### Fase 3: Domínio administrativo

#### 3.1 Types e DTOs
- [ ] Criar `admin/types/admin.types.ts` com:
  - `AdminUser` (interface)
  - `CreateAdminUserDTO`
  - `UpdateAdminUserDTO`
  - `AdminSession`

**Arquivos a criar:**
- `src/admin/types/admin.types.ts`

---

#### 3.2 Repository
- [ ] Criar `admin/repositories/admin-user.repository.interface.ts` com interface
- [ ] Criar `admin/repositories/supabase-admin-user.repository.ts` com implementação
- [ ] Extrair lógica de acesso a dados de `services/admin.ts`

**Arquivos a criar:**
- `src/admin/repositories/admin-user.repository.interface.ts`
- `src/admin/repositories/supabase-admin-user.repository.ts`

---

#### 3.3 Service
- [ ] Refatorar `services/admin.ts` → `admin/services/admin.service.ts`:
  - Remover acesso direto ao Supabase
  - Receber repository via construtor (DI)
  - Adicionar error handling com erros customizados
  - Adicionar logging estruturado

**Arquivos a modificar:**
- `src/services/admin.ts` → `src/admin/services/admin.service.ts`

---

#### 3.4 Validators
- [ ] Criar `admin/validators/admin.validators.ts` com validators Zod

**Arquivos a criar:**
- `src/admin/validators/admin.validators.ts`

---

#### 3.5 Index do domínio
- [ ] Criar `admin/index.ts` exportando:
  - Types
  - Repositories
  - Services
  - Validators

**Arquivos a criar:**
- `src/admin/index.ts`

---

### Fase 4: Domínio de email

#### 4.1 Reorganização
- [ ] Mover `services/email-adapter.ts` → `email/services/email-adapter.ts`
- [ ] Mover `services/email/` → `email/services/email/` (manter estrutura interna)
- [ ] Criar `email/services/email.service.ts` com lógica de negócio (se necessário)
- [ ] Criar `email/types/email.types.ts` com tipos (mover de `services/email/types.ts`)
- [ ] Criar `email/index.ts` com exports

**Arquivos a mover/reorganizar:**
- `src/services/email-adapter.ts` → `src/email/services/email-adapter.ts`
- `src/services/email/` → `src/email/services/email/`
- `src/email.ts` → remover (se existir, mover conteúdo)

**Arquivos a criar:**
- `src/email/services/email.service.ts` (se necessário)
- `src/email/types/email.types.ts`
- `src/email/index.ts`

---

### Fase 5: Factory Pattern

#### 5.1 Service Factory
- [ ] Criar `factories/service-factory.ts` com `createServices()`:
  - Recebe SupabaseClient
  - Cria repositories
  - Cria services com repositories injetados
  - Retorna objeto com todos os services

**Arquivos a criar:**
- `src/factories/service-factory.ts`
- `src/factories/index.ts`

**Referência:** `front-pagamento/src/lib/payments/factories/service-factory.ts`

---

### Fase 6: Routes (Handlers)

#### 6.1 Melhorar error handling
- [ ] Atualizar `routes/pagarme-checkout.ts`:
  - Usar `createErrorHandler()` para tratamento de erros
  - Usar erros customizados
  - Adicionar logging estruturado
- [ ] Atualizar `routes/pagarme-webhook.ts`:
  - Mesmas melhorias
- [ ] Atualizar `routes/asaas-checkout.ts`:
  - Mesmas melhorias
- [ ] Atualizar `routes/asaas-webhook.ts`:
  - Mesmas melhorias

**Arquivos a modificar:**
- `src/routes/pagarme-checkout.ts`
- `src/routes/pagarme-webhook.ts`
- `src/routes/asaas-checkout.ts`
- `src/routes/asaas-webhook.ts`

---

### Fase 7: Reorganizar exports

#### 7.1 Index principal
- [ ] Atualizar `src/index.ts`:
  - Exportar de domínios organizados
  - Manter compatibilidade com exports atuais (se possível)
  - Documentar exports públicos

**Arquivos a modificar:**
- `src/index.ts`

---

### Fase 8: Limpeza e documentação

#### 8.1 Remover arquivos obsoletos
- [ ] Remover `src/services/pagarme.ts` (já movido)
- [ ] Remover `src/services/asaas.ts` (já movido)
- [ ] Remover `src/services/admin.ts` (já movido)
- [ ] Remover `src/services/email-adapter.ts` (já movido)
- [ ] Remover `src/services/email/` (já movido)
- [ ] Remover `src/email.ts` (se existir)
- [ ] Limpar `src/types/index.ts` (tipos movidos para domínios)
- [ ] Limpar `src/validators/index.ts` (validators movidos para domínios)

---

#### 8.2 Documentação
- [ ] Atualizar `README.md` com nova estrutura
- [ ] Documentar padrões seguidos
- [ ] Adicionar exemplos de uso
- [ ] Atualizar `ENV.md` se necessário

---

## 📝 Convenções a seguir

### Nomenclatura
- **Arquivos**: `kebab-case` (ex: `payment.service.ts`)
- **Classes**: `PascalCase` (ex: `PaymentService`)
- **Interfaces**: `PascalCase` com sufixo (ex: `PaymentRepository`)
- **Types**: `PascalCase` (ex: `Payment`, `CreatePaymentDTO`)
- **Funções**: `camelCase` (ex: `createPayment()`)
- **Constantes**: `UPPER_SNAKE_CASE` ou objetos `CONFIG`

### Estrutura de arquivo
```typescript
// 1. Imports externos
import { ... } from 'external-lib'

// 2. Imports internos (domínio)
import { ... } from '../types'
import { ... } from '../repositories'

// 3. Types e interfaces locais
type LocalType = ...

// 4. Constantes
const CONSTANT = ...

// 5. Classes/funções principais
export class Service { ... }

// 6. Exports
export { ... }
```

### Error handling
- **Services**: Lançar erros customizados (não retornar `{ success: false }`)
- **Routes**: Usar `createErrorHandler()` para tratamento automático
- **Mensagens**: Sempre em português

### Logging
- **Services**: Usar `getLogger()` para logs estruturados
- **Níveis**: `debug`, `info`, `warn`, `error`
- **Contexto**: Incluir IDs, inputs relevantes (não dados sensíveis)

### Validação
- **Sempre usar Zod** para validação
- **Schemas separados** para Create, Update, Query
- **Mensagens em português**

---

## ✅ Checklist de validação

Após cada fase, validar:

- [ ] Código segue convenções de nomenclatura
- [ ] Error handling implementado corretamente
- [ ] Logging estruturado em services
- [ ] Validators usando Zod
- [ ] Types bem definidos
- [ ] Repository Pattern implementado
- [ ] Service Pattern implementado
- [ ] Factory Pattern implementado
- [ ] Exports organizados
- [ ] Documentação atualizada
- [ ] Compatibilidade mantida (se necessário)

---

## 🔗 Referências

- [Guia de desenvolvimento - Estrutura](docs/guides/guia-desenvolvimento/01-estrutura-organizacao.md)
- [Guia de desenvolvimento - API Routes e Services](docs/guides/guia-desenvolvimento/03-api-routes-services.md)
- [Guia de desenvolvimento - Repositories e Validators](docs/guides/guia-desenvolvimento/04-repositories-validators.md)
- [Guia de desenvolvimento - Error Handling](docs/guides/guia-desenvolvimento/06-error-handling-logging.md)
- [Guia de desenvolvimento - Nomenclatura](docs/guides/guia-desenvolvimento/09-convencoes-nomenclatura.md)

---

## 📅 Estimativa

- **Fase 1**: 2-3 horas (Infraestrutura base)
- **Fase 2**: 4-6 horas (Domínio de pagamentos)
- **Fase 3**: 2-3 horas (Domínio administrativo)
- **Fase 4**: 1-2 horas (Domínio de email)
- **Fase 5**: 1 hora (Factory Pattern)
- **Fase 6**: 2-3 horas (Routes)
- **Fase 7**: 1 hora (Exports)
- **Fase 8**: 1-2 horas (Limpeza e documentação)

**Total estimado**: 14-21 horas

---

**Versão**: 1.0  
**Criado em**: Janeiro 2025  
**Projeto**: @quitou/core

