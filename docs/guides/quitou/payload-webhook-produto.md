# Payload do webhook de pagamento confirmado

Documento para integradores que recebem webhooks do Quitou quando um pagamento é confirmado. Descreve a estrutura do payload, headers e boas práticas.

---

## 1. Visão geral

Quando um pagamento é confirmado (PIX, boleto, cartão), o Quitou envia um POST para a URL configurada em `products.webhook_url`. O payload contém dados do pedido, usuário e produto para que o sistema de destino libere acesso.

**Quando é enviado:** sempre que o status do pedido passa para `paid` (após confirmação do gateway Pagar.me ou Asaas).

**Condição:** apenas se o produto tiver `webhook_url` preenchido. O `webhook_secret` é obrigatório para assinar o payload.

**Segurança:** o payload é assinado com HMAC-SHA256 usando o `webhook_secret`. O consumidor deve validar o header `X-Webhook-Signature` antes de processar.

---

## 2. Estrutura do payload

```json
{
  "event": "payment.confirmed",
  "sent_at": "2025-03-19T17:20:18.123Z",
  "order": {
    "id": "uuid-do-pedido",
    "user_id": "uuid-do-usuario",
    "product_id": "uuid-do-produto",
    "price_id": "uuid-do-preco",
    "subscription_id": "uuid-da-assinatura-ou-null",
    "order_type": "one_time",
    "status": "paid",
    "amount_cents": 99000,
    "payment_method": "pix",
    "payment_gateway": "asaas",
    "paid_at": "2025-03-19T17:15:00.000Z",
    "metadata": {
      "price_metadata_snapshot": {
        "title": "À vista",
        "lifetime_access": true,
        "access_months": null
      },
      "product_name_snapshot": "Curso de React",
      "product_description_snapshot": "...",
      "refund_policy_snapshot": { ... }
    },
    "created_at": "2025-03-19T17:10:00.000Z"
  },
  "user": {
    "id": "uuid-do-usuario",
    "email": "cliente@email.com",
    "name": "Nome do Cliente"
  },
  "product": {
    "id": "uuid-do-produto",
    "ref": "curso-react",
    "name": "Curso de React"
  },
  "price": {
    "id": "uuid-do-preco",
    "ref": "avista",
    "amount": 99000,
    "currency": "BRL",
    "recurring": false,
    "interval": null,
    "interval_count": null
  }
}
```

---

## 3. Campos do payload

### 3.1 Raiz

| Campo     | Tipo   | Descrição                                      |
|-----------|--------|------------------------------------------------|
| `event`   | string | Sempre `"payment.confirmed"`                   |
| `sent_at` | string | ISO 8601 do envio (UTC)                        |
| `order`   | object | Pedido completo                                |
| `user`    | object | Dados mínimos do comprador                     |
| `product` | object | Dados mínimos do produto                       |
| `price`   | object | Dados mínimos do preço comprado                |

### 3.2 order

| Campo               | Tipo    | Descrição                                      |
|---------------------|---------|------------------------------------------------|
| `id`                | string  | UUID do pedido                                 |
| `user_id`           | string  | UUID do usuário (auth.users)                   |
| `product_id`        | string  | UUID do produto                                |
| `price_id`          | string  | UUID do preço                                  |
| `subscription_id`   | string? | UUID da assinatura (null se one_time)          |
| `order_type`        | string  | `"one_time"` ou `"subscription"`               |
| `status`            | string  | Sempre `"paid"` neste webhook                  |
| `amount_cents`      | number  | Valor em centavos (99000 = R$ 990,00)         |
| `payment_method`    | string  | `"pix"`, `"boleto"`, `"credit_card"`          |
| `payment_gateway`   | string  | `"pagarme"` ou `"asaas"`                      |
| `paid_at`           | string  | ISO 8601 da confirmação (UTC)                  |
| `metadata`          | object  | Snapshots do checkout (ver abaixo)             |
| `created_at`        | string  | ISO 8601 da criação (UTC)                     |

### 3.3 order.metadata (snapshots)

| Campo                     | Descrição                                              |
|---------------------------|--------------------------------------------------------|
| `price_metadata_snapshot` | Cópia do metadata do preço no checkout. Contém `lifetime_access`, `access_months` — ver [payload-acesso-produto.md](payload-acesso-produto.md) |
| `product_name_snapshot`   | Nome do produto no momento do checkout                 |
| `product_description_snapshot` | Descrição do produto no checkout                 |
| `refund_policy_snapshot`  | Política de reembolso vigente                          |

### 3.4 user

| Campo   | Tipo   | Descrição                    |
|---------|--------|------------------------------|
| `id`    | string | UUID do usuário              |
| `email` | string | Email do comprador           |
| `name`  | string | Nome do comprador            |

### 3.5 product

| Campo  | Tipo   | Descrição                    |
|--------|--------|------------------------------|
| `id`   | string | UUID do produto              |
| `ref`  | string | Referência única (slug)      |
| `name` | string | Nome do produto              |

### 3.6 price

| Campo          | Tipo    | Descrição                                      |
|----------------|---------|------------------------------------------------|
| `id`           | string  | UUID do preço                                  |
| `ref`          | string  | Referência única                               |
| `amount`       | number  | Valor em centavos                              |
| `currency`     | string  | Moeda (ex: `"BRL"`)                            |
| `recurring`    | boolean | `true` = assinatura, `false` = pagamento único |
| `interval`     | string? | `"month"`, `"year"` ou null                    |
| `interval_count` | number? | Quantidade de intervalos (ex: 1)             |

---

## 4. Headers da requisição

| Header           | Descrição                                      |
|------------------|------------------------------------------------|
| `Content-Type`   | `application/json`                             |
| `User-Agent`     | `Quitou-Webhook/1.0`                           |
| `X-Webhook-Event`| `payment.confirmed`                            |
| `X-Webhook-Id`   | ID único do envio (para idempotência/debug)    |
| `X-Webhook-Signature` | `sha256=<hex>` — HMAC-SHA256 do body usando `webhook_secret` |

### 4.1 Validação da assinatura

O consumidor deve validar o header `X-Webhook-Signature` antes de processar:

```ts
import crypto from 'crypto'

function validateWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = signatureHeader.slice(7)
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'))
}

// Uso: receber o body como string (raw), não como JSON parseado
const rawBody = await request.text()
const signature = request.headers.get('X-Webhook-Signature')
if (!validateWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 })
}
const payload = JSON.parse(rawBody)
```

---

## 5. Resposta esperada

O endpoint deve retornar **HTTP 2xx** para indicar sucesso. O Quitou considera sucesso qualquer status entre 200 e 299.

- **2xx** → processamento aceito
- **4xx/5xx** → o Quitou pode retentar (política de retry depende da implementação)

---

## 6. Idempotência

O mesmo pagamento pode gerar retentativas se o endpoint falhar. O consumidor deve usar `order.id` como chave de idempotência:

```ts
// Pseudocódigo
async function handleWebhook(payload: PaymentConfirmedPayload) {
  const { order } = payload
  const existing = await db.findAccessByOrderId(order.id)
  if (existing) {
    return { ok: true, alreadyProcessed: true }
  }
  await grantAccess(order.user_id, order.product_id, payload.order.metadata.price_metadata_snapshot)
  await db.recordOrderProcessed(order.id)
  return { ok: true }
}
```

---

## 7. Liberar acesso ao produto

Use `order.metadata.price_metadata_snapshot` para obter duração de acesso. Ver [payload-acesso-produto.md](payload-acesso-produto.md) para regras de `lifetime_access` e `access_months`.

---

## 8. Exemplo de handler (Node.js)

```ts
export async function POST(request: Request) {
  const payload = await request.json()

  if (payload.event !== 'payment.confirmed') {
    return Response.json({ error: 'Evento não suportado' }, { status: 400 })
  }

  const { order, user } = payload

  // Idempotência
  const alreadyProcessed = await hasProcessedOrder(order.id)
  if (alreadyProcessed) {
    return Response.json({ received: true, alreadyProcessed: true })
  }

  const meta = order.metadata?.price_metadata_snapshot ?? {}
  const isLifetime = meta.lifetime_access === true || meta.access_months === 999
  const months = isLifetime ? null : meta.access_months

  await grantProductAccess({
    userId: user.id,
    email: user.email,
    productRef: payload.product.ref,
    isLifetime,
    months,
    orderId: order.id,
  })

  return Response.json({ received: true })
}
```

---

## 9. Resumo

| Item              | Valor                                      |
|-------------------|--------------------------------------------|
| Evento            | `payment.confirmed`                         |
| Método            | POST                                       |
| Content-Type      | application/json                            |
| Assinatura        | `X-Webhook-Signature: sha256=<hmac>` (obrigatório validar) |
| Chave idempotência| `order.id`                                 |
| Dados de acesso   | `order.metadata.price_metadata_snapshot`   |

**Configuração no produto:** `webhook_url` + `webhook_secret` (ambos obrigatórios para envio).

---

**Versão:** 1.0  
**Última atualização:** Março 2025  
**Projeto:** Quitou
