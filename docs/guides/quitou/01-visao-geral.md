# Visão Geral do Quitou

## 🎯 O que é o Quitou?

O **Quitou** é um sistema de pagamentos brasileiro completo, projetado para facilitar a integração de pagamentos em aplicações JavaScript/TypeScript. O sistema oferece suporte a múltiplos gateways de pagamento (Pagar.me e Asaas) e uma interface administrativa completa.

### Missão

Proporcionar uma solução de pagamentos que seja:

- **Simples de integrar**: API clara e documentada
- **Flexível**: Suporte a múltiplos gateways e métodos de pagamento
- **Segura**: Validações, RLS e boas práticas de segurança
- **Completa**: Interface administrativa, webhooks, e gestão de produtos

---

## 🏗️ Arquitetura

O Quitou é composto por dois componentes principais:

### 1. `@quitou/core` (Pacote NPM)

**Localização**: `../pagamento/`

**Responsabilidades:**

- Lógica de integração com gateways (Pagar.me, Asaas)
- Criação de links de pagamento
- Processamento de webhooks
- Validações e utilitários

**Características:**

- Framework-agnostic (funciona em qualquer ambiente JS)
- Minimalista (apenas lógica essencial)
- Extensível via `metadata` JSONB

### 2. `front-pagamento` (Aplicação Next.js)

**Localização**: `./` (este projeto)

**Responsabilidades:**

- Interface administrativa
- Páginas de checkout
- Componentes React reutilizáveis
- API Routes para integração

**Características:**

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/UI
- TanStack Query

---

## 👥 Públicos-Alvo

### 🛒 Clientes

**Necessidades:**

- Realizar pagamentos de forma simples
- Escolher método de pagamento (PIX, Boleto, Cartão)
- Acompanhar status do pagamento
- Receber confirmações por email

**Funcionalidades principais:**

- Checkout intuitivo
- Múltiplos métodos de pagamento
- Polling automático de status
- Notificações por email

### 👨‍💼 Administradores

**Necessidades:**

- Gerenciar produtos e preços
- Acompanhar pedidos e pagamentos
- Configurar políticas de reembolso
- Visualizar estatísticas

**Funcionalidades principais:**

- Dashboard com métricas
- Gerenciamento de produtos
- Visualização de pedidos
- Configuração de webhooks

### 👨‍💻 Desenvolvedores

**Necessidades:**

- Integrar pagamentos em suas aplicações
- Entender a arquitetura
- Customizar fluxos
- Manter o código

**Funcionalidades principais:**

- API clara e documentada
- Componentes reutilizáveis
- Hooks customizados
- Documentação completa

---

## 💳 Gateways de Pagamento

### Pagar.me (Principal)

**Use para:**

- ✅ **Cartão de Crédito** (parcelado em até 12x)
- ✅ **PIX** (à vista com desconto)
- ✅ **Boleto** (à vista com desconto)
- ✅ Checkout unificado (cliente escolhe na mesma tela)

**Quando usar:**

- Maioria dos casos
- Quando precisa de múltiplas formas de pagamento
- Quando precisa de checkout unificado

### Asaas (Boleto Parcelado)

**Use para:**

- ✅ **Boleto Parcelado** (cada parcela = 1 boleto separado)
- ✅ Suporta até 12 parcelas

**Quando usar:**

- Apenas quando cliente precisa parcelar via boleto
- Casos específicos de boleto parcelado

**Limitações:**

- ❌ Não tem PIX
- ❌ Não tem Cartão

---

## 📦 Funcionalidades Principais

### 1. Gestão de Produtos

- Criar e editar produtos
- Configurar múltiplos preços
- Definir métodos de pagamento permitidos
- Configurar políticas de reembolso

### 2. Checkout

- Página de checkout responsiva
- Seleção de gateway
- Formulário de dados do cliente
- Polling automático de status

### 3. Webhooks

- Processamento assíncrono de eventos
- Validação de assinatura
- Atualização automática de status
- Logs de eventos

### 4. Painel Administrativo

- Dashboard com métricas
- Gerenciamento de produtos
- Visualização de pedidos
- Configuração de webhooks

### 5. Autenticação

- Login com email/OTP
- Criação automática de usuário
- Verificação de admin
- Proteção de rotas

---

## 🔄 Fluxo de Pagamento

### Fluxo Completo

1. **Cliente acessa checkout** (`/checkout/[priceId]`)
2. **Preenche dados** (nome, email, CPF, etc.)
3. **Escolhe gateway** (Pagar.me ou Asaas)
4. **Escolhe método de pagamento** (PIX, Boleto, Cartão)
5. **Frontend chama API** (`/api/payments/{gateway}/checkout`)
6. **API cria pagamento** no gateway
7. **API retorna** `payment_id` e `payment_link_url`
8. **Frontend abre dialog** com status
9. **Polling automático** verifica status a cada 3s
10. **Cliente paga** via link, boleto ou PIX
11. **Webhook recebe** confirmação do gateway
12. **Webhook atualiza** status no banco
13. **Polling detecta** mudança de status
14. **Dialog exibe** mensagem de sucesso
15. **Callback** `onSuccess()` é executado

---

## 🎯 Próximos Passos

- [Arquitetura do Sistema](02-arquitetura.md)
- [Sistema de Pagamentos](03-pagamentos.md)
- [Fluxo de Checkout](04-checkout.md)
- [Webhooks](05-webhooks.md)
- [Admin](06-admin.md)
- [Integração com banco existente](07-integracao-banco-existente.md)
- [Deploy e rollback](08-deploy.md)
- [Auditoria de dependências](09-audit-dependencias.md)
- [Testes](10-testes.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
