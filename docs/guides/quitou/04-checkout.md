# Fluxo de Checkout

## 🎯 Visão Geral

O checkout do Quitou permite que clientes realizem pagamentos de forma simples e segura, com suporte a múltiplos gateways (Pagar.me e Asaas) e métodos de pagamento (PIX, Boleto, Cartão).

---

## 📋 Fluxo Completo

### 1. Cliente acessa checkout

**URL**: `/checkout/[priceId]`

**O que acontece:**

- Página carrega informações do preço
- Exibe dados do produto
- Mostra formulário de dados do cliente

### 2. Cliente preenche dados

**Campos obrigatórios:**

- Nome completo
- Email
- CPF/CNPJ
- Telefone (opcional)

**Validações:**

- Email válido
- CPF/CNPJ válido
- Campos obrigatórios preenchidos

### 3. Cliente escolhe gateway

**Opções:**

- **Pagar.me**: Cartão, PIX, Boleto
- **Asaas**: Boleto Parcelado (se permitido)

**Seleção automática:**

- Baseada em `payment_methods` do produto
- Gateway sugerido baseado no método escolhido

### 4. Cliente escolhe método de pagamento

**Pagar.me:**

- Cartão de Crédito (parcelado)
- PIX (à vista)
- Boleto (à vista)

**Asaas:**

- Boleto Parcelado (cada parcela = 1 boleto)

### 5. Frontend chama API

**Endpoint**: `POST /api/payments/{gateway}/checkout`

**Payload:**

```typescript
{
  priceId: string
  customer: {
    name: string
    email: string
    document: string
    phone?: string
  }
  paymentMethod: 'credit_card' | 'pix' | 'boleto' | 'asaas_boleto_parcelado'
}
```

### 6. API processa checkout

**O que acontece:**

1. Valida dados do cliente
2. Busca preço e produto
3. Cria pagamento no gateway
4. Salva no banco de dados
5. Retorna `payment_id` e `payment_link_url`

### 7. Frontend recebe resposta

**Resposta:**

```typescript
{
  success: true
  data: {
    paymentId: string
    paymentLinkUrl: string
    paymentMethod: string
  }
}
```

### 8. Frontend abre dialog de status

**Componente**: `PaymentStatus`

**Funcionalidades:**

- Exibe status do pagamento
- Inicia polling automático (3s)
- Mostra instruções de pagamento
- Atualiza status em tempo real

### 9. Cliente realiza pagamento

**Dependendo do método:**

- **PIX**: Copia código ou QR Code
- **Boleto**: Imprime ou copia código
- **Cartão**: Preenche dados no link

### 10. Webhook recebe confirmação

**O que acontece:**

1. Gateway envia webhook
2. API valida assinatura
3. API atualiza status no banco
4. API processa lógica de negócio

### 11. Polling detecta mudança

**O que acontece:**

1. Polling verifica status
2. Detecta mudança para `paid`
3. Para polling automaticamente
4. Exibe mensagem de sucesso

### 12. Callback executado

**O que acontece:**

1. `onSuccess()` é chamado
2. Redireciona ou mostra sucesso
3. Envia email de confirmação (se configurado)

---

## 🔧 Implementação

### Página de Checkout

**Localização**: `src/app/checkout/[priceId]/page.tsx`

**Estrutura:**

```tsx
export default async function CheckoutPage({ params }: { params: Promise<{ priceId: string }> }) {
  const { priceId } = await params

  // Buscar dados do preço
  const price = await getPrice(priceId)

  return <CheckoutForm priceId={priceId} price={price} />
}
```

### Componente CheckoutForm

**Localização**: `src/components/checkout/checkout-form.tsx`

**Funcionalidades:**

- Formulário de dados do cliente
- Seleção de gateway
- Seleção de método de pagamento
- Validação de dados
- Chamada à API

### API Route de Checkout

**Localização**: `src/app/api/payments/{gateway}/checkout/route.ts`

**Estrutura:**

```typescript
export async function POST(request: Request) {
  // 1. Validar dados
  const body = await request.json()
  const validation = validateCheckoutData(body)

  // 2. Buscar preço e produto
  const price = await getPrice(body.priceId)
  const product = await getProduct(price.product_id)

  // 3. Criar pagamento no gateway
  const payment = await createPayment({
    amount: price.amount,
    customer: body.customer,
    paymentMethod: body.paymentMethod,
  })

  // 4. Salvar no banco
  await savePayment(payment)

  // 5. Retornar resposta
  return NextResponse.json({
    paymentId: payment.id,
    paymentLinkUrl: payment.link_url,
  })
}
```

---

## 🎨 Componentes Relacionados

### PaymentStatus

Exibe status do pagamento com polling.

**Props:**

```typescript
interface PaymentStatusProps {
  paymentId: string
  paymentLinkUrl: string
  onSuccess?: () => void
}
```

### PaymentDataForm

Formulário de dados do cliente.

**Props:**

```typescript
interface PaymentDataFormProps {
  onSubmit: (data: CustomerData) => void
  loading?: boolean
}
```

### GatewaySelector

Seletor de gateway de pagamento.

**Props:**

```typescript
interface GatewaySelectorProps {
  allowedMethods: string[]
  onSelect: (gateway: string) => void
}
```

---

## ✅ Checklist de Implementação

- [ ] Página de checkout criada
- [ ] Formulário de dados do cliente
- [ ] Validação de dados
- [ ] Seleção de gateway
- [ ] Seleção de método de pagamento
- [ ] API Route de checkout
- [ ] Integração com gateway
- [ ] Salvamento no banco
- [ ] Dialog de status
- [ ] Polling automático
- [ ] Tratamento de erros
- [ ] Responsividade

---

## 📚 Próximos Passos

- [Webhooks](05-webhooks.md)
- [Sistema de Pagamentos](03-pagamentos.md)
- [Arquitetura](02-arquitetura.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
