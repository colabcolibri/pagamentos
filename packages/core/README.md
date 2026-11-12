# @quitou/core

Sistema de pagamentos brasileiro para aplicações JavaScript/TypeScript com Pagar.me e Asaas.

## 🎯 Filosofia

Este pacote é **minimalista e framework-agnostic**:
- ✅ Apenas lógica essencial de pagamentos (Pagar.me, Asaas)
- ✅ Funciona em qualquer ambiente JS (Node, Deno, Bun, Edge)
- ✅ Sem opiniões sobre seu modelo de negócio
- ✅ Extensível via `metadata` JSONB

## 💳 Quando Usar Cada Gateway?

### **Pagar.me** (Principal)
Use para checkout completo com múltiplas formas de pagamento:
- ✅ **Cartão de Crédito** (parcelado em até 12x)
- ✅ **PIX** (à vista com desconto)
- ✅ **Boleto** (à vista com desconto)
- ✅ Checkout unificado (cliente escolhe na mesma tela)

### **Asaas** (Boleto Parcelado)
Use **APENAS** para boleto parcelado:
- ✅ **Boleto Parcelado** (cada parcela = 1 boleto separado)
- ✅ Suporta até 12 parcelas
- ❌ **NÃO** tem PIX ou Cartão

**Dica:** Na maioria dos casos, use **Pagar.me**. Asaas é para casos específicos onde o cliente precisa parcelar via boleto.

## 📖 Documentação

- **[ENV.md](./ENV.md)** - Variáveis de ambiente necessárias
- **[Aplicação Web (`front-pagamento`)](../../front-pagamento/README.md)** - Next.js 16 completo com checkout, webhooks, painel administrativo, MCP e migrations PostgreSQL

## 📦 Instalação

```bash
# Instalar o pacote
pnpm add @quitou/core

# Tipos para desenvolvimento (se usar TypeScript)
pnpm add -D @types/nodemailer
```

## 🚀 Uso Básico

### 1. Criar link de pagamento (Pagar.me)

```typescript
import { createPagarmeService } from '@quitou/core';

// Criar instância do serviço
const pagarmeService = createPagarmeService();

const response = await pagarmeService.createPaymentLink({
  amount: 99000, // R$ 990,00 em centavos
  description: 'Curso de TypeScript',
  customer: {
    name: 'João Silva',
    email: 'joao@example.com',
    type: 'individual',
    document: '12345678900',
  },
  max_installments: 12,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

if (response.success) {
  console.log('Link:', response.data.url);
}
```

### 2. Criar boleto parcelado (Asaas)

**Use caso:** Cliente quer parcelar via boleto (cada parcela = 1 boleto separado)

```typescript
import { createAsaasService } from '@quitou/core';

const asaasService = createAsaasService();

// Criar cliente primeiro
const customer = await asaasService.createCustomer({
  name: 'Maria Santos',
  email: 'maria@example.com',
  cpfCnpj: '12345678900',
});

// Criar boleto parcelado (ex: R$ 990,00 em 10x = 10 boletos de R$ 99,00)
const response = await asaasService.createInstallmentPayment(
  customer.id,
  990,    // Valor total em R$
  10,     // Número de parcelas (10 boletos)
  'Curso de TypeScript'
);

console.log('Boletos criados:', response.length); // 10 boletos
```

### 3. Controlar métodos de pagamento permitidos

```typescript
import { 
  isPaymentMethodAllowed,
  getDisabledMethods,
  getAllowedMethods,
  getGatewayForMethod,
} from '@quitou/core';

const product = {
  payment_methods: ['credit_card', 'pix'], // Permite apenas cartão e PIX
};

// Verificar se um método é permitido
isPaymentMethodAllowed(product, 'pix'); // true
isPaymentMethodAllowed(product, 'asaas_boleto_parcelado'); // false

// Obter métodos desabilitados
getDisabledMethods(product); // ['boleto', 'asaas_boleto_parcelado']

// Obter métodos permitidos
getAllowedMethods(product); // ['credit_card', 'pix']

// Determinar gateway para um método
getGatewayForMethod('credit_card'); // 'pagarme'
getGatewayForMethod('asaas_boleto_parcelado'); // 'asaas'
```

### 4. Utilitários

```typescript
import { 
  formatCurrency, 
  isValidCPF, 
  isValidEmail,
  calculateCashPrice,
} from '@quitou/core';

formatCurrency(99000); // "R$ 990,00"
isValidCPF('123.456.789-00'); // true/false
calculateCashPrice(100000, 10); // 90000 (10% desconto)
```

## 🗄️ Schema Supabase

### Instalação rápida

1. Copie as migrations de `templates/migrations/` para seu projeto Supabase
2. Execute na ordem: `001_create_payments_schema.sql`, `002_products_and_prices.sql`, etc
3. Configure variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url
SUPABASE_SERVICE_ROLE_KEY=sua-key
PAGARME_SECRET_KEY=sk_...
ASAAS_API_KEY=...
```

### Estrutura do Schema

O schema `payments` contém:
- **products** - Produtos genéricos com `payment_methods` configuráveis
- **prices** - Preços flexíveis (one-time ou recorrente)
- **subscriptions** - Assinaturas recorrentes (opcional)
- **pagarme_payments** - Histórico de pagamentos Pagar.me
- **asaas_payments** - Histórico de pagamentos Asaas

#### **Coluna `payment_methods` (JSONB Array)**

Controla quais métodos de pagamento são permitidos para cada produto:

```sql
-- Padrão (permite cartão, PIX e boleto)
payment_methods: ["credit_card", "pix", "boleto"]

-- Apenas PIX e cartão
payment_methods: ["credit_card", "pix"]

-- Apenas boleto parcelado (Asaas)
payment_methods: ["asaas_boleto_parcelado"]

-- Permite TODOS os métodos
payment_methods: ["credit_card", "pix", "boleto", "asaas_boleto_parcelado"]
```

**Benefícios do GIN Index:**
- ✅ Queries rápidas: `WHERE payment_methods @> '["pix"]'`
- ✅ Escalável para milhares de produtos
- ✅ Suporte nativo do PostgreSQL

### Exemplo de uso do metadata

```sql
-- Inserir produto customizado
INSERT INTO payments.products (ref, name, metadata) VALUES (
  'curso-typescript',
  'Curso de TypeScript',
  '{
    "type": "course",
    "duration_days": 365,
    "category": "programming",
    "features": ["videos", "exercises", "certificate"]
  }'::jsonb
);

-- Inserir preço com configurações
INSERT INTO payments.prices (ref, product_id, amount, metadata) VALUES (
  'curso-typescript-price',
  'product-id-aqui',
  99000,
  '{
    "cash_discount": 10,
    "max_installments": 12,
    "trial_days": 7
  }'::jsonb
);
```

## 🔧 Templates Next.js (Opcional)

Se você usa Next.js, copie os templates de `templates/api/`:

### API Routes

```
seu-projeto/
├── app/
│   └── api/
│       └── payments/
│           ├── pagarme/
│           │   ├── checkout/route.ts
│           │   └── webhook/route.ts
│           └── orchestrator/route.ts
```

### Exemplo de integração

```typescript
// app/api/payments/pagarme/checkout/route.ts
import { pagarmeService } from '@quitou/core';
// ... resto do código do template
```

## 📧 Email com Adapter Pattern

Sistema desacoplado - use **qualquer provider** de email:

```typescript
import { EmailService } from '@quitou/core';
import { NodemailerAdapter } from './email-adapters/nodemailer-adapter';

// 1. Configure o adapter Nodemailer
const adapter = new NodemailerAdapter({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

// 2. Crie o serviço
const emailService = new EmailService(adapter);

// 3. Use métodos prontos
await emailService.sendPaymentLink({
  to: 'cliente@email.com',
  userName: 'João',
  productName: 'Curso TypeScript',
  paymentLinkUrl: 'https://...',
});
```

Veja `templates/examples/email-adapters/README.md` para configuração completa.

## 📋 Políticas de Reembolso

**Recomendado:** Armazene no `metadata` do produto (banco de dados):

```sql
-- Produto com política embutida
INSERT INTO payments.products (ref, name, metadata) VALUES (
  'curso-typescript',
  'Curso de TypeScript',
  '{
    "type": "course",
    "refund_policy": {
      "title": "Política de compra",
      "subtitle": "Para seu curso online",
      "sections": [...],
      "footer": "...",
      "checkout": {
        "buttonText": "Ver política de compra",
        "acceptanceText": "Li e aceito a política de compra",
        "acceptanceRequired": "Você precisa aceitar..."
      }
    }
  }'::jsonb
);
```

**Templates prontos:**
- ✅ Migration 007 (validação opcional)
- ✅ seed-examples.sql (3 produtos prontos)
- ✅ Políticas: Subscription, Course, Digital Product

Veja `templates/examples/refund-policies/SETUP.md` para guia completo.

## 🎨 Customização

### 1. Produtos Flexíveis

Não force tipos específicos. Use `metadata`:

```typescript
// ❌ Ruim: Enum rígido
type ProductType = 'course' | 'game'; 

// ✅ Bom: Metadata flexível
const product = {
  name: 'Meu Produto',
  metadata: {
    type: 'qualquer-coisa',
    custom_field: 'valor',
  }
}
```

### 2. Preços Dinâmicos

```typescript
const priceMetadata = price.metadata as {
  cash_discount?: number;
  max_installments?: number;
};

const cashDiscount = priceMetadata.cash_discount || 0;
```

### 3. Ações Pós-Pagamento

Customize o orchestrator para:
- Ativar acesso a produtos
- Enviar emails
- Atualizar perfil do usuário
- Integrar com outros sistemas

## 📚 Documentação Completa

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Visão geral da arquitetura
- **[PUBLISH.md](./PUBLISH.md)** - Como publicar no NPM
- **Templates:**
  - `templates/migrations/` - 7 SQLs para Supabase
  - `templates/api/` - API routes Next.js
  - `templates/examples/email-adapters/` - Sistema de email
  - `templates/examples/refund-policies/` - Políticas de reembolso

## 🔒 Segurança

- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Service role apenas via API routes
- ✅ Validação de dados com Zod
- ✅ Sanitização de inputs
- ✅ Webhook signature verification (implemente no template)

## 🧪 Validação

```typescript
import { checkoutFormSchema } from '@quitou/core';

const result = checkoutFormSchema.safeParse(formData);
if (!result.success) {
  console.error('Erros:', result.error.errors);
}
```

## 🤝 Contribuindo

Contribuições, issues e pull requests são bem-vindos!

## 📄 Licença

[MIT](../../LICENSE)

## 🆘 Suporte

Dúvidas? Veja os exemplos em `templates/` ou abra uma issue.

---

**Importante:** Este pacote fornece a **estrutura mínima**. Você adiciona as **regras do seu negócio** via `metadata` e lógica de aplicação.
