# Sistema de Pagamentos

## 🎯 Visão Geral

O Quitou suporta múltiplos gateways de pagamento e métodos, permitindo flexibilidade na escolha de como receber pagamentos.

---

## 💳 Gateways Suportados

### Pagar.me (Principal)

**Métodos de pagamento:**

- ✅ **Cartão de Crédito** - Parcelado em até 12x
- ✅ **PIX** - À vista com desconto
- ✅ **Boleto** - À vista com desconto

**Características:**

- Checkout unificado (cliente escolhe na mesma tela)
- Suporte a parcelamento
- Descontos para pagamento à vista
- Webhooks para atualização de status

**Quando usar:**

- Maioria dos casos
- Quando precisa de múltiplas formas de pagamento
- Quando precisa de checkout unificado

### Asaas (Boleto Parcelado)

**Métodos de pagamento:**

- ✅ **Boleto Parcelado** - Cada parcela = 1 boleto separado
- ✅ Suporta até 12 parcelas

**Características:**

- Apenas boleto parcelado
- Cada parcela gera um boleto separado
- Útil para valores altos

**Quando usar:**

- Apenas quando cliente precisa parcelar via boleto
- Casos específicos de boleto parcelado

**Limitações:**

- ❌ Não tem PIX
- ❌ Não tem Cartão

---

## 🔄 Fluxo de Pagamento

### 1. Cliente escolhe produto

- Acessa página de checkout
- Visualiza produto e preço
- Escolhe método de pagamento

### 2. Frontend cria pagamento

- Chama API `/api/payments/{gateway}/checkout`
- Envia dados do cliente
- Recebe `payment_id` e `payment_link_url`

### 3. Cliente realiza pagamento

**Dependendo do método:**

- **PIX**: Copia código ou escaneia QR Code
- **Boleto**: Imprime ou copia código
- **Cartão**: Preenche dados no link

### 4. Gateway processa

- Valida pagamento
- Processa transação
- Envia webhook

### 5. Webhook atualiza status

- API recebe webhook
- Valida assinatura
- Atualiza status no banco
- Executa lógica de negócio

### 6. Frontend detecta mudança

- Polling verifica status
- Detecta mudança para `paid`
- Exibe mensagem de sucesso

---

## 📊 Status de Pagamento

### Status Possíveis

- **pending** - Aguardando pagamento
- **paid** - Pagamento confirmado
- **cancelled** - Pagamento cancelado
- **refunded** - Pagamento reembolsado
- **overdue** - Pagamento vencido (boleto)

### Transições de Status

```
pending → paid (pagamento confirmado)
pending → cancelled (cancelado)
paid → refunded (reembolsado)
pending → overdue (boleto vencido)
```

---

## 🎨 Métodos de Pagamento

### Cartão de Crédito

**Características:**

- Parcelado em até 12x
- Processamento imediato
- Taxa por transação

**Configuração:**

```typescript
{
  payment_method: 'credit_card',
  max_installments: 12,
}
```

### PIX

**Características:**

- Pagamento à vista
- Processamento imediato
- Desconto configurável
- QR Code ou código copia e cola

**Configuração:**

```typescript
{
  payment_method: 'pix',
  cash_discount: 10, // 10% de desconto
}
```

### Boleto

**Características:**

- Pagamento à vista
- Vencimento configurável
- Desconto configurável
- Processamento após pagamento

**Configuração:**

```typescript
{
  payment_method: 'boleto',
  cash_discount: 5, // 5% de desconto
  expires_in_days: 3,
}
```

### Boleto Parcelado (Asaas)

**Características:**

- Cada parcela = 1 boleto
- Até 12 parcelas
- Vencimentos escalonados

**Configuração:**

```typescript
{
  payment_method: 'asaas_boleto_parcelado',
  installments: 10, // 10 boletos
}
```

---

## 🔧 Configuração de Produtos

### Payment Methods

**Controla quais métodos são permitidos:**

```sql
-- Permite todos os métodos
payment_methods: ["credit_card", "pix", "boleto", "asaas_boleto_parcelado"]

-- Apenas PIX e cartão
payment_methods: ["credit_card", "pix"]

-- Apenas boleto parcelado
payment_methods: ["asaas_boleto_parcelado"]
```

### Metadata do Preço

**Configurações adicionais:**

```json
{
  "cash_discount": 10,
  "max_installments": 12,
  "trial_days": 7
}
```

---

## 📚 Próximos Passos

- [Fluxo de pedidos e pagamentos (criação e exclusão)](fluxo-pedidos-pagamentos.md)
- [Checkout](04-checkout.md)
- [Webhooks](05-webhooks.md)
- [Arquitetura](02-arquitetura.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
