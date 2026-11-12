---
title: API Contracts
status: draft
version: 1.0
updated: 2026-11-10
depends_on: [05_architecture.md, 06_database.md]
blocks: []
---

# 07 — API contracts

Rotas do Next em `front-pagamento/src/app/api/`. Não há OpenAPI no repo. Base local: `http://localhost:3004`. Produção: `NEXT_PUBLIC_APP_URL`.

## API style

| Attribute | Value |
| --------- | ----- |
| **Style** | REST no mesmo host do app |
| **Base URL** | origem do Next. Sem prefixo `/v1` |
| **Versioning** | nenhum |
| **Documentation** | esta tabela e os guias em `docs/guides/quitou/`. Sem OpenAPI |

## Authentication

| Mechanism | Header / param | Consistent with `02_security` |
| --------- | -------------- | ----------------------------- |
| Cookie de sessão Supabase | cookie, não Bearer de API pública | sim, para perfil e admin |
| Segredo de webhook | definido pelo gateway | sim |
| Chave anon | no browser, fora destas rotas, direto no Supabase | dívida registrada em `05` |

## Common headers

| Header | Required | Description |
| ------ | -------- | ----------- |
| `Content-Type` | nas rotas com corpo JSON | `application/json` |
| Cookie de sessão | perfil e admin | sessão Supabase |

## Error envelope

O código em `front-pagamento/src/lib/errors/error-handler.ts` devolve:

```json
{
  "error": "mensagem",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

`details` sai quando faz sentido e não em produção para erro de banco. Rate limit usa `code: RATE_LIMITED`, segundo o guia de deploy.

## Endpoints (stub — expand before `approved`)

| Method | Path | Purpose | Auth | Request | Response |
| ------ | ---- | ------- | ---- | ------- | -------- |
| GET | `/api/health` | liveness | não | — | 200 |
| GET | `/api/products/[ref]` | produto público | não | — | produto |
| GET | `/api/products/by-price/[priceId]` | preço do checkout | não | — | preço e produto |
| GET | `/api/products/batch` | vários produtos | não | query | lista |
| POST | `/api/payments/coupon/preview` | simula cupom | não | corpo do cupom | desconto |
| POST | `/api/payments/pagarme/checkout` | cobra no Pagar.me | sessão ou fluxo de checkout | corpo validado no core | pedido e dados de pagamento |
| POST | `/api/payments/asaas/checkout/avista` | Asaas à vista | igual | corpo | igual |
| POST | `/api/payments/asaas/checkout/parcelado` | Asaas parcelado | igual | corpo | igual |
| GET | `/api/payments/[id]/status` | status para polling | ver lacuna | — | status, PIX, boleto |
| GET | `/api/payments/[id]/confirmation` | confirmação | ver lacuna | — | resumo |
| POST | `/api/payments/pagarme/webhook` | evento Pagar.me | segredo | payload do gateway | ack |
| POST | `/api/payments/asaas/webhook` | evento Asaas | segredo | payload do gateway | ack |
| GET, PATCH | `/api/profile` | perfil do cliente | sessão do dono | campos de perfil | perfil |
| GET | `/api/profile/orders` | pedidos do cliente | sessão do dono | — | lista |
| GET, POST | `/api/admin/products` | catálogo | admin | produto | produto |
| GET, PATCH, DELETE | `/api/admin/products/[id]` | um produto | admin | — | produto |
| * | `/api/admin/products/[id]/prices` | preços | admin | preço | preço |
| POST | `.../prices/[priceId]/recalc-stock` | recalcula estoque | admin | — | preço |
| GET, POST | `/api/admin/orders` | pedidos | admin | filtro | lista |
| POST | `/api/admin/orders/[id]/mark-paid` | marca pago | admin | — | pedido |
| POST | `/api/admin/orders/[id]/cancel` | cancela | admin | — | pedido |
| POST | `/api/admin/orders/[id]/delete-permanent` | apaga o que a regra permite | admin | — | ack |
| GET | `/api/admin/payments` | pagamentos | admin | — | lista |
| POST | `/api/admin/payments/[id]/cancel` | cancela link | admin | — | pagamento |
| GET | `/api/admin/dashboard/stats` | resumo de vendas | admin | — | agregados |
| GET | `/api/admin/subscriptions` | assinaturas | admin | — | lista |
| GET, POST | `/api/admin/coupons` | cupons | admin | cupom | cupom |
| * | `/api/admin/platform-settings` | ajustes | admin | json | json |
| GET | `/api/admin/email-logs` | e-mails | admin | — | lista |
| POST | `/api/admin/resend-email` | reenvio | admin | id | ack |
| GET | `/api/admin/webhooks` | eventos | admin | — | lista |
| GET | `/api/admin/connections` | teste de conexão | admin | — | status |
| POST | `/api/contact` | contato | não | formulário | ack |
| GET | `/api/cep` | consulta CEP | não | cep | endereço |

Método exato de cada rota admin de cupom e settings deve ser relido na aprovação. A pasta existe. O verbo de cada arquivo não foi aberto um a um nesta init.

## Pagination / filtering (if applicable)

| Param | Type | Default | Max |
| ----- | ---- | ------- | --- |
| não padronizado | — | — | listas admin não têm contrato único de página neste doc |

## Webhooks / callbacks

| Event | Payload | Signature | Retry |
| ----- | ------- | --------- | ----- |
| Pagar.me | corpo do provedor | `PAGARME_WEBHOOK_USER` e `PAGARME_WEBHOOK_SECRET` | o provedor reenvia. Dedup em `webhook_events` |
| Asaas | corpo do provedor | `ASAAS_WEBHOOK_SECRET` | igual |
| URL configurada no produto | saída da aplicação para o sistema do produto | ver guia `payload-webhook-produto.md` | não lido nesta init |

## Rate limits

Ver `02_security` § Rate limiting. Os números vivos estão no `proxy.ts`: checkout 30/min, admin 240/min, webhook 60/min, código de acesso 10/min por IP. Memória por instância.

## Internal contracts (non-HTTP)

| Consumer | Provider | Contract location |
| -------- | -------- | ----------------- |
| route handler de checkout | `@quitou/core` | `packages/core/src/routes/` |
| UI | route handler | fetch nas páginas e hooks. Não é um SDK publicado |
| Meridian | `meridian_delivery.py` | fora do produto de pagamento |

## Gaps / open questions

| # | Endpoint / contract missing | US / epic |
| - | ------------------------- | --------- |
| 1 | `GET /api/payments/[id]/status` exige sessão e o pagamento do próprio usuário | fechado em US-0016 |
| 2 | Corpo exato de checkout e de webhook | guias `ASAAS-WEBHOOKS-CHECKOUT.md` e `03-pagamentos.md`. Completar antes de `approved` |
| 3 | OpenAPI | não pedido |

## Gate

Os caminhos da tabela existem no repo ou estão marcados como leitura incompleta. Não inventar rota nova aqui.
