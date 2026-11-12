# Guia de desenvolvimento - Quitou

> **Objetivo**: Este guia documenta os padrões, convenções e estrutura do projeto Quitou. Use como referência ao desenvolver novas features, componentes ou funcionalidades de pagamento.

> **🤖 Para IAs**: Este arquivo funciona como um **router de documentação**. Use a seção "🎯 Guia de navegação para IAs" abaixo para encontrar rapidamente qual arquivo consultar baseado na tarefa que você precisa realizar.

---

## 🎯 Guia de navegação para IAs

**Use esta seção para decidir qual arquivo do guia você precisa consultar baseado na tarefa:**

### 📋 Por tipo de tarefa

| Tarefa                           | Arquivo(s) a consultar                                                                                                           | Prioridade |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Criar nova entidade (CRUD)**   | [Parte 3](03-api-routes-services.md) → [Parte 4](04-repositories-validators.md) → [Parte 5](05-hooks-tanstack-query.md)          | Alta       |
| **Criar novo componente React**  | [Parte 2](02-componentes-ui.md) → [Parte 8](08-componentes-dry.md)                                                               | Alta       |
| **Criar API Route**              | [Parte 3](03-api-routes-services.md) → [Parte 4](04-repositories-validators.md) → [Parte 6](06-error-handling-logging.md)        | Alta       |
| **Criar Service**                | [Parte 3](03-api-routes-services.md) → [Parte 6](06-error-handling-logging.md)                                                   | Alta       |
| **Criar Repository**             | [Parte 4](04-repositories-validators.md)                                                                                         | Alta       |
| **Criar Hook customizado**       | [Parte 5](05-hooks-tanstack-query.md)                                                                                            | Média      |
| **Tratar erros**                  | [Parte 6](06-error-handling-logging.md)                                                                                          | Média      |
| **Adicionar validação**          | [Parte 4](04-repositories-validators.md)                                                                                         | Média      |
| **Implementar checkout**         | [Quitou - Checkout](../quitou/04-checkout.md) → [Parte 3](03-api-routes-services.md)                                             | Alta       |
| **Configurar webhook**           | [Quitou - Webhooks](../quitou/05-webhooks.md) → [Parte 3](03-api-routes-services.md)                                               | Alta       |
| **Entender nomenclatura**        | [Parte 9](09-convencoes-nomenclatura.md)                                                                                          | Média      |
| **Integrar sistemas**            | [Parte 10](10-cookies-compartilhados.md)                                                                                         | Baixa      |
| **Entender design patterns**     | Seção "🎨 Design patterns utilizados" (neste arquivo)                                                                            | Média      |
| **Entender estrutura de pastas** | [Parte 1](01-estrutura-organizacao.md)                                                                                           | Média      |
| **Entender padrão DRY**          | [Parte 8](08-componentes-dry.md) → [Parte 2](02-componentes-ui.md)                                                               | Média      |
| **Autenticação e autorização**   | [Parte 3](03-api-routes-services.md#autenticação-e-contexto-de-api)                                                              | Alta       |
| **Criar migrations**             | [Parte 11](11-migrations-seguras-performance.md)                                                                                 | Alta       |

### 🔍 Por contexto de trabalho

- **"Preciso criar um CRUD completo"**: Comece por [Parte 1](01-estrutura-organizacao.md) para entender estrutura, depois [Parte 4](04-repositories-validators.md) para Repository, [Parte 3](03-api-routes-services.md) para Service e API Route, e [Parte 5](05-hooks-tanstack-query.md) para o Hook.

- **"Preciso implementar checkout"**: Comece por [Checkout](../quitou/04-checkout.md) para entender o fluxo, depois [Parte 3](03-api-routes-services.md) para API Route e Service.

- **"Preciso entender como funciona a arquitetura"**: Leia [Arquitetura do Quitou](../quitou/02-arquitetura.md) e a seção "🎨 Design patterns utilizados" abaixo para entender os patterns.

- **"Preciso corrigir um bug ou adicionar funcionalidade"**: Identifique a camada afetada (Component → Hook → API Route → Service → Repository) e consulte a parte correspondente.

- **"Preciso entender o padrão DRY"**: Leia [Parte 8](08-componentes-dry.md) e [Parte 2](02-componentes-ui.md).

- **"Preciso criar uma migration"**: Leia [Parte 11](11-migrations-seguras-performance.md) para garantir segurança e performance.

- **"Preciso entender autenticação/autorização"**: Leia [Parte 3 - Contexto de API](03-api-routes-services.md#autenticação-e-contexto-de-api).

- **"Qual padrão de nomenclatura usar?"**: Leia [Parte 9](09-convencoes-nomenclatura.md) para entender camelCase vs snake_case.

- **"Preciso integrar com outro sistema"**: Leia [Parte 10](10-cookies-compartilhados.md) para cookies compartilhados.

### ⚡ Consulta rápida por arquivo

- **[Parte 1](01-estrutura-organizacao.md)**: Estrutura de pastas, nomenclatura, organização
- **[Parte 2](02-componentes-ui.md)**: Componentes React, UI, responsividade, shadcn/ui
- **[Parte 3](03-api-routes-services.md)**: API Routes, Services, Factory Pattern, autenticação
- **[Parte 4](04-repositories-validators.md)**: Repository Pattern, Validators Zod
- **[Parte 5](05-hooks-tanstack-query.md)**: Custom Hooks, TanStack Query
- **[Parte 6](06-error-handling-logging.md)**: Error Handling, Logging
- **[Parte 7](07-organizacao-tipos.md)**: Organização de tipos TypeScript
- **[Parte 8](08-componentes-dry.md)**: Padrão DRY para componentes
- **[Parte 9](09-convencoes-nomenclatura.md)**: Convenções de nomenclatura (camelCase vs snake_case)
- **[Parte 10](10-cookies-compartilhados.md)**: Cookies compartilhados entre sistemas
- **[Parte 11](11-migrations-seguras-performance.md)**: Migrations seguras e performáticas

---

## 🎯 Princípios fundamentais

1. **Arquitetura em camadas**: Client → Hook → API Route → Service → Repository → Database (detalhes em [Parte 3](03-api-routes-services.md))
2. **Type safety**: TypeScript rigorosamente, evite `any`
3. **DRY**: Textos em `CONTENT`, lógica reutilizável em services/hooks (detalhes em [Parte 8](08-componentes-dry.md))
4. **Dependency Injection**: Services recebem repositories via construtor (Factory Pattern)
5. **Error handling centralizado**: Erros customizados e `createApiHandler` (detalhes em [Parte 6](06-error-handling-logging.md))
6. **Validação em todas as entradas**: Zod validators (detalhes em [Parte 4](04-repositories-validators.md))
7. **Logging estruturado**: `getLogger()` em services (detalhes em [Parte 6](06-error-handling-logging.md))

---

## 🎨 Design patterns utilizados

Este projeto aplica vários design patterns. Conhecer esses patterns ajuda a entender a arquitetura do código e por que certas decisões foram tomadas.

> **💡 Importante**: Cada pattern foi escolhido para resolver problemas específicos. Entender o "por quê" é tão importante quanto entender o "como".

---

### Patterns criacionais

#### 1. Factory Method Pattern

**Onde é usado:**

- Criação de services (`createServices`)
- Criação de adapters de email (`EmailAdapterFactory`)
- Criação de clientes Supabase (`createClient`)

**Por quê usar:**

- ✅ **Dependency Injection**: Facilita injetar dependências (repositories) nos services
- ✅ **Centralização**: Toda criação de services em um único lugar
- ✅ **Testabilidade**: Fácil criar mocks para testes
- ✅ **Manutenibilidade**: Mudanças na criação afetam apenas o factory

**Detalhes e exemplos práticos:** [Parte 3 - Factory Pattern](03-api-routes-services.md#-factory-pattern)

---

### Patterns estruturais

#### 2. Repository Pattern

**Onde é usado:**

- **TODOS** os acessos a dados (produtos, preços, pagamentos, etc.)
- Abstração da camada de acesso a dados

**Por quê usar:**

- ✅ **Abstração**: Services não dependem de Supabase diretamente
- ✅ **Testabilidade**: Fácil criar mocks para testes unitários
- ✅ **Flexibilidade**: Pode trocar Supabase por outro banco sem mudar services
- ✅ **Separação de responsabilidades**: Lógica de negócio separada de acesso a dados

**Quando usar:**

- **SEMPRE** que precisar acessar dados do banco
- Nunca acesse Supabase diretamente em Services ou API Routes

**Detalhes e exemplos práticos:** [Parte 4 - Repository Pattern](04-repositories-validators.md#-repositories)

---

#### 3. Adapter Pattern

**Onde é usado:**

- Integrações externas (email, gateways de pagamento, APIs externas)
- Quando precisa adaptar interfaces incompatíveis

**Por quê usar:**

- ✅ **Flexibilidade**: Pode trocar providers sem mudar código cliente
- ✅ **Testabilidade**: Fácil mockar para testes
- ✅ **Abstração**: Código cliente não conhece detalhes de implementação

**Quando usar:**

- Quando integra com serviços externos que podem variar (Pagar.me, Asaas, etc.)
- Quando precisa padronizar interfaces diferentes

---

### Patterns comportamentais

#### 4. Strategy Pattern

**Onde é usado:**

- Validações (diferentes validators para diferentes entidades)
- Processamento de dados (diferentes estratégias de transformação)
- Gateways de pagamento (Pagar.me, Asaas)

**Por quê usar:**

- ✅ **Flexibilidade**: Pode trocar algoritmos sem modificar código cliente
- ✅ **Organização**: Cada estratégia em seu próprio lugar
- ✅ **Extensibilidade**: Fácil adicionar novas estratégias

**Quando usar:**

- Quando tem múltiplas formas de fazer a mesma coisa
- Quando quer isolar algoritmos específicos

**Detalhes e exemplos práticos:** [Parte 4 - Validators](04-repositories-validators.md#-validators)

---

### Patterns React/Next.js

#### 5. Provider Pattern (Context API)

**Onde é usado:**

- Query Client (`QueryProvider`)
- Autenticação
- Perfil do usuário

**Por quê usar:**

- ✅ **Evita prop drilling**: Não precisa passar props por múltiplos níveis
- ✅ **Estado global**: Compartilha estado entre componentes distantes
- ✅ **Performance**: Re-renderiza apenas componentes que usam o contexto

**Quando usar:**

- Quando precisa compartilhar estado entre múltiplos componentes
- Quando prop drilling se torna incômodo (3+ níveis)

---

#### 6. Custom Hooks Pattern

**Onde é usado:**

- **TODOS** os hooks customizados do projeto
- Lógica reutilizável do cliente

**Por quê usar:**

- ✅ **Reutilização**: Lógica compartilhada entre componentes
- ✅ **Encapsulamento**: Esconde complexidade (TanStack Query, etc.)
- ✅ **Testabilidade**: Fácil testar hooks isoladamente
- ✅ **Organização**: Separa lógica de apresentação

**Quando usar:**

- **SEMPRE** que precisar buscar dados do servidor
- Quando tem lógica de estado reutilizável
- Quando quer encapsular complexidade

**Detalhes e exemplos práticos:** [Parte 5 - Custom Hooks](05-hooks-tanstack-query.md#-custom-hooks)

---

### Resumo dos patterns

| Pattern            | Categoria      | Onde usar                     | Importância    |
| ------------------ | -------------- | ----------------------------- | -------------- |
| **Factory Method** | Criacional     | Criação de services, adapters | ⭐⭐⭐ Alta    |
| **Repository**     | Estrutural     | Acesso a dados                | ⭐⭐⭐ Crítica |
| **Adapter**        | Estrutural     | Integrações externas          | ⭐⭐ Média     |
| **Strategy**       | Comportamental | Validações, algoritmos        | ⭐⭐ Média     |
| **Provider**       | React          | Estado global                 | ⭐⭐⭐ Alta    |
| **Custom Hooks**   | React          | Lógica reutilizável           | ⭐⭐⭐ Crítica |

---

## 🔄 Atualizações

Este guia é um documento vivo. Quando você:

- Criar um novo padrão
- Descobrir uma melhor prática
- Resolver um problema comum

**Documente aqui!** Isso ajuda toda a equipe.

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
