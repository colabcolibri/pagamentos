# Sistema de Webhooks

## 🎯 Visão Geral

Os webhooks são notificações assíncronas enviadas pelos gateways de pagamento (Pagar.me e Asaas) quando ocorrem eventos importantes, como confirmação de pagamento, cancelamento ou reembolso.

---

## 🔄 Fluxo de Webhook

### 1. Gateway envia webhook

**Quando acontece:**

- Pagamento confirmado
- Pagamento cancelado
- Reembolso processado
- Assinatura atualizada

**Formato:**

- **Pagar.me**: POST com JSON e header `X-Hub-Signature-256`
- **Asaas**: POST com JSON e header `asaas-access-token`

### 2. API recebe webhook

**Endpoint**: `POST /api/payments/{gateway}/webhook`

**O que acontece:**

1. Valida assinatura do webhook
2. Processa evento
3. Atualiza status no banco
4. Executa lógica de negócio
5. Retorna 200 OK

### 3. Banco de dados atualizado

**Tabelas afetadas:**

- `payments.pagarme_payments` ou `payments.asaas_payments`
- `payments.orders`
- `payments.subscriptions` (se aplicável)

### 4. Lógica de negócio executada

**O que pode acontecer:**

- Enviar email de confirmação
- Ativar acesso ao produto
- Atualizar perfil do usuário
- Registrar logs

---

## 🔒 Segurança

### Validação de Assinatura

**Pagar.me:**

```typescript
import crypto from 'crypto'

function validatePagarmeSignature(payload: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return `sha256=${hash}` === signature
}
```

**Asaas:**

```typescript
function validateAsaasSignature(token: string, expectedToken: string): boolean {
  return token === expectedToken
}
```

### Implementação na API Route

```typescript
export async function POST(request: Request) {
  // 1. Obter payload
  const payload = await request.text()
  const signature = request.headers.get('X-Hub-Signature-256')

  // 2. Validar assinatura
  const secret = process.env.PAGARME_WEBHOOK_SECRET
  if (!validatePagarmeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Processar evento
  const event = JSON.parse(payload)
  await processWebhookEvent(event)

  // 4. Retornar sucesso
  return NextResponse.json({ received: true })
}
```

---

## 📋 Tipos de Eventos

### Pagar.me

**Eventos principais:**

- `payment.created` - Pagamento criado
- `payment.paid` - Pagamento confirmado
- `payment.canceled` - Pagamento cancelado
- `payment.refunded` - Pagamento reembolsado
- `subscription.created` - Assinatura criada
- `subscription.updated` - Assinatura atualizada

### Asaas

**Eventos principais:**

- `PAYMENT_CREATED` - Pagamento criado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_DELETED` - Pagamento deletado

---

## 🔧 Implementação

### API Route de Webhook

**Localização**: `src/app/api/payments/{gateway}/webhook/route.ts`

**Estrutura:**

```typescript
export async function POST(request: Request) {
  try {
    // 1. Validar assinatura
    const isValid = await validateWebhookSignature(request)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Obter payload
    const event = await request.json()

    // 3. Processar evento
    await processWebhookEvent(event)

    // 4. Retornar sucesso
    return NextResponse.json({ received: true })
  } catch (error) {
    // 5. Logar erro
    console.error('Webhook error:', error)

    // 6. Retornar erro (gateway vai retentar)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Processamento de Eventos

```typescript
async function processWebhookEvent(event: any) {
  switch (event.type) {
    case 'payment.paid':
      await handlePaymentPaid(event.data)
      break

    case 'payment.canceled':
      await handlePaymentCanceled(event.data)
      break

    case 'payment.refunded':
      await handlePaymentRefunded(event.data)
      break

    default:
      console.log('Unhandled event type:', event.type)
  }
}
```

### Atualização de Status

```typescript
async function handlePaymentPaid(payment: any) {
  // 1. Atualizar status no banco
  await supabase
    .from('pagarme_payments')
    .update({ status: 'paid', paid_at: new Date() })
    .eq('gateway_payment_id', payment.id)

  // 2. Atualizar order
  await supabase.from('orders').update({ status: 'paid' }).eq('payment_id', payment.id)

  // 3. Executar lógica de negócio
  await activateProductAccess(payment.user_id, payment.product_id)

  // 4. Enviar email
  await sendPaymentConfirmationEmail(payment.user_id, payment.id)
}
```

---

## 📊 Logs de Webhooks

### Tabela de Logs

**Localização**: `payments.webhook_events`

**Estrutura:**

```sql
CREATE TABLE payments.webhook_events (
  id UUID PRIMARY KEY,
  gateway VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  signature VARCHAR(255),
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Registrar Evento

```typescript
async function logWebhookEvent(event: any, gateway: string) {
  await supabase.from('webhook_events').insert({
    gateway,
    event_type: event.type,
    payload: event,
    processed: false,
  })
}
```

---

## ✅ Checklist de Implementação

- [ ] API Route de webhook criada
- [ ] Validação de assinatura implementada
- [ ] Processamento de eventos
- [ ] Atualização de status no banco
- [ ] Lógica de negócio executada
- [ ] Logs de eventos
- [ ] Tratamento de erros
- [ ] Retry automático (se necessário)
- [ ] Testes de webhook

---

## 🧪 Testes

### Testar Webhook Localmente

**Usando ngrok:**

```bash
# 1. Iniciar servidor local
pnpm dev

# 2. Expor via ngrok
ngrok http 3000

# 3. Configurar URL no gateway
# Pagar.me: Dashboard > Webhooks > Adicionar
# URL: https://seu-subdominio.ngrok.io/api/payments/pagarme/webhook
```

### Testar com curl

```bash
curl -X POST http://localhost:3000/api/payments/pagarme/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{
    "type": "payment.paid",
    "data": { ... }
  }'
```

---

## 📚 Documentos relacionados

- [Payload de acesso ao produto](payload-acesso-produto.md) — estrutura de `lifetime_access` e `access_months` para integração
- [Checkout](04-checkout.md)
- [Sistema de Pagamentos](03-pagamentos.md)
- [Arquitetura](02-arquitetura.md)

---

**Versão**: 1.0  
**Última atualização**: Janeiro 2025  
**Projeto**: Quitou
