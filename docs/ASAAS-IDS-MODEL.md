# Modelo de IDs Asaas

Este documento descreve o modelo de identificadores Asaas na tabela `payments.asaas_payments`, garantindo separação clara entre Checkout API e Payments API.

## Colunas

| Coluna | Descrição |
|--------|-----------|
| `asaas_checkout_id` | ID da sessão de checkout (Checkout API). Formato: `cs_xxx` ou UUID. |
| `asaas_payment_id` | ID da cobrança/pagamento (pay_xxx). Usado em Payments API e preenchido após pagamento no Checkout API. |
| `asaas_installment_id` | ID do parcelamento (boleto parcelado). |

## Constraint

Pelo menos um dos IDs deve estar preenchido:

```sql
CHECK (
  asaas_payment_id IS NOT NULL
  OR asaas_installment_id IS NOT NULL
  OR asaas_checkout_id IS NOT NULL
)
```

## Fluxos por tipo de cobrança

| Fluxo | asaas_checkout_id | asaas_payment_id | asaas_installment_id |
|-------|-------------------|------------------|----------------------|
| **Checkout API (criação)** | checkout.id | null | null |
| **Checkout API (após PAYMENT_RECEIVED)** | checkout.id | payment.id | null |
| **Payments API** | null | payment.id | null |
| **Parcelado (boleto)** | null | null ou pay_xxx | installment_id |

## Webhooks e localização do registro

O `findPaymentRecord` no webhook busca na ordem:

1. **asaas_payment_id** = `payment.id` (pay_xxx)
2. **asaas_installment_id** = `payment.installment`
3. **asaas_checkout_id** = `payment.checkoutSession` (Checkout API)

## Admin cancel

Para cancelar cobrança pendente no Asaas:

- **asaas_payment_id** → `deletePayment(paymentId)` (DELETE /payments/:id)
- **asaas_checkout_id** → `cancelCheckout(checkoutId)` (POST /checkouts/:id/cancel)
- **asaas_installment_id** → `cancelInstallmentPayments(installmentId)` (DELETE /installments/:id/payments)

## Referências

- [Checkout API](https://docs.asaas.com/reference/criar-um-checkout)
- [Cancelar checkout](https://docs.asaas.com/reference/cancelar-um-checkout)
- [Eventos para Checkout](https://docs.asaas.com/docs/eventos-para-checkout)
