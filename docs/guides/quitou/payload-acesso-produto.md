# Payload de acesso ao produto — para integração com webhook

Documento para a equipe que consome o webhook. Explica como obter a **duração de acesso** ao produto a partir do pedido, para liberar o conteúdo no sistema de destino.

---

## 1. Onde está a informação

Quando um pagamento é confirmado, o webhook recebe dados do **order** (pedido). A informação de acesso ao produto está em:

```
order.metadata.price_metadata_snapshot
```

Esse objeto é uma cópia do `metadata` do preço no momento da criação do checkout. Ele contém os campos de duração de acesso.

---

## 2. Campos de duração de acesso

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `lifetime_access` | `boolean` | `true` = acesso vitalício (pagamento único) ou enquanto assinatura ativa |
| `access_months` | `number` | Quantidade de meses de acesso. Relevante **apenas** quando `lifetime_access` é `false` |

### Regras de interpretação

- **`lifetime_access === true`** → acesso ilimitado. Não usar `access_months`.
- **`lifetime_access === false`** (ou ausente) **e** `access_months` presente → acesso por N meses.
- **Assinatura** → `lifetime_access: true` significa "acesso enquanto a assinatura estiver ativa".

---

## 3. Compatibilidade com dados antigos

Preços criados antes da migração podem ter `access_months: 999` em vez de `lifetime_access: true`.

**Tratamento recomendado:**

```ts
const meta = order.metadata?.price_metadata_snapshot ?? {}

const isLifetime =
  meta.lifetime_access === true || meta.access_months === 999

const months = isLifetime ? null : (meta.access_months ?? undefined)
```

- `months === null` → vitalício ou assinatura
- `months === 12` → 12 meses de acesso

---

## 4. Exemplo de payload (order.metadata)

### Pagamento único — vitalício

```json
{
  "payment_link_url": "https://...",
  "checkout_session_id": "...",
  "billing_type": "PIX",
  "refund_policy_snapshot": { ... },
  "price_topics_snapshot": [ ... ],
  "price_metadata_snapshot": {
    "title": "À vista",
    "cash_discount": 10,
    "max_installments": 12,
    "lifetime_access": true,
    "success_message": "Seu pagamento foi confirmado com sucesso."
  },
  "product_name_snapshot": "Curso de React",
  "product_description_snapshot": "..."
}
```

**Interpretação:** `lifetime_access: true` → acesso vitalício.

---

### Pagamento único — 12 meses

```json
{
  "price_metadata_snapshot": {
    "title": "Plano 12 meses",
    "cash_discount": 0,
    "max_installments": 12,
    "lifetime_access": false,
    "access_months": 12,
    "success_message": "Seu pagamento foi confirmado."
  }
}
```

**Interpretação:** `access_months: 12` → 12 meses de acesso.

---

### Assinatura (acesso enquanto ativa)

```json
{
  "price_metadata_snapshot": {
    "title": "Plano mensal",
    "cash_discount": 0,
    "max_installments": 12,
    "lifetime_access": true,
    "success_message": "Seu pagamento foi confirmado."
  }
}
```

**Interpretação:** assinatura recorrente. Acesso enquanto o cliente mantiver a assinatura ativa. O cancelamento da assinatura encerra o acesso.

---

### Dado legado (access_months: 999)

```json
{
  "price_metadata_snapshot": {
    "title": "À vista",
    "cash_discount": 10,
    "max_installments": 12,
    "access_months": 999
  }
}
```

**Interpretação:** `access_months: 999` equivale a `lifetime_access: true` → tratar como vitalício.

---

## 5. Pseudocódigo para liberar acesso

```ts
function getAccessDuration(priceMetadata: Record<string, unknown> | null): {
  isLifetime: boolean
  months: number | null
} {
  if (!priceMetadata) {
    return { isLifetime: true, months: null }
  }

  const lifetimeAccess = priceMetadata.lifetime_access === true
  const accessMonths999 = priceMetadata.access_months === 999

  const isLifetime = lifetimeAccess || accessMonths999

  if (isLifetime) {
    return { isLifetime: true, months: null }
  }

  const months =
    typeof priceMetadata.access_months === 'number' &&
    priceMetadata.access_months >= 1 &&
    priceMetadata.access_months <= 998
      ? priceMetadata.access_months
      : null

  return { isLifetime: false, months }
}

// Uso no webhook
const meta = order.metadata?.price_metadata_snapshot ?? {}
const { isLifetime, months } = getAccessDuration(meta)

if (isLifetime) {
  // Liberar acesso vitalício ou "enquanto assinatura ativa"
  await grantLifetimeAccess(userId, productId)
} else if (months) {
  // Liberar acesso por N meses
  const expiresAt = addMonths(new Date(), months)
  await grantAccessUntil(userId, productId, expiresAt)
}
```

---

## 6. Resumo

| Cenário | `lifetime_access` | `access_months` | Ação |
|---------|-------------------|-----------------|------|
| Vitalício (pagamento único) | `true` | omitido | Acesso ilimitado |
| Duração fixa (ex.: 12 meses) | `false` | `12` | Acesso até data + 12 meses |
| Assinatura | `true` | omitido | Acesso enquanto assinatura ativa |
| Legado | ausente | `999` | Tratar como vitalício |

---

**Versão:** 1.0  
**Última atualização:** Março 2025  
**Projeto:** Quitou
