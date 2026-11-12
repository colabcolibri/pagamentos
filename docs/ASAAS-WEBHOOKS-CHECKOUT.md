# Webhooks Asaas — Checkout API

Com o fluxo unificado via **Checkout API** (à vista e parcelado), é necessário configurar os webhooks corretos no Asaas.

## Eventos a ativar

Configure no Asaas (**Configurações > Integrações > Webhooks**) os seguintes eventos:

### Cobrança (Payments API — legado, se ainda usar)

| Evento | Descrição |
|--------|-----------|
| `PAYMENT_RECEIVED` | Pagamento recebido (PIX, boleto) |
| `PAYMENT_CONFIRMED` | Pagamento confirmado (cartão) |
| `PAYMENT_REFUNDED` | Estorno |

### Checkout (Checkout API — fluxo atual)

| Evento | Descrição |
|--------|-----------|
| `CHECKOUT_PAID` | Checkout pago (obrigatório) |
| `CHECKOUT_CANCELED` | Checkout cancelado (obrigatório para gestão de pedidos) |
| `CHECKOUT_EXPIRED` | Checkout expirado por tempo (`minutesToExpire`) — recomendado: atualiza pedido/pagamento para `expired` no app |
| `CHECKOUT_CREATED` | Checkout criado (opcional — só auditoria no servidor, sem escrita no banco) |

## Configuração via API

```bash
POST https://api.asaas.com/v3/webhooks
# ou sandbox: https://api-sandbox.asaas.com/v3/webhooks

Header: access_token: $sua_chave_api

{
  "name": "Quitou Checkout",
  "url": "https://seu-dominio.com/api/webhooks/asaas",
  "sendType": "SEQUENTIALLY",
  "enabled": true,
  "interrupted": false,
  "events": [
    "PAYMENT_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_REFUNDED",
    "CHECKOUT_PAID",
    "CHECKOUT_CANCELED",
    "CHECKOUT_EXPIRED",
    "CHECKOUT_CREATED"
  ]
}
```

## Fluxo atual

- **À vista** e **parcelado**: ambos usam Checkout API (`POST /v3/checkouts`)
- O `CHECKOUT_PAID` é enviado quando o cliente paga na página do Asaas
- `CHECKOUT_EXPIRED` marca `asaas_payments` e `orders` como `expired` quando ainda estavam `pending` (alinhado ao fim da sessão no Asaas)
- `CHECKOUT_CREATED` gera apenas log estruturado (útil para conferir no provedor de logs se o evento está chegando)
- O handler busca o registro por `asaas_checkout_id` = `checkout.id` (ID da sessão de checkout)
- Ver [ASAAS-IDS-MODEL.md](./ASAAS-IDS-MODEL.md) para o modelo completo de IDs

## Referências

- [Eventos para Checkout](https://docs.asaas.com/docs/eventos-para-checkout)
- [Criar webhook via API](https://docs.asaas.com/docs/create-new-webhook-via-api)
