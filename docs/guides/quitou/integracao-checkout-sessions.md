# Manual de Integração — Checkout Sessions & Links S2S

Este guia descreve como qualquer sistema externo (SaaS, plataforma de cursos, ERP, bot ou painel próprio) deve se conectar ao **Quitou** usando **Checkout Sessions** (`POST /api/v1/checkout/sessions` + `/pagar/[token]`).

O fluxo suporta dois modos:
- **`catalog`**: usa planos/preços já cadastrados no catálogo do produto no Quitou (com ou sem plano pré-selecionado).
- **`custom`**: permite que o backend do sistema integrador informe um `amountCents` calculado no servidor (ex.: cobrança pró-rata, taxa avulsa, ajuste ou pedido sob medida), respeitando piso e teto configurados no Quitou.

---

## 1. Pré-requisitos no Admin do Quitou

1. **Produto (`Admin → Produtos`)**:
   - Crie ou edite o produto e anote seu `ref` (ex.: `addon-premium` ou `assinatura-pro`).
   - Se o sistema externo for enviar valores dinâmicos (`pricingMode: "custom"`), habilite **"Permitir valor flexível via API (Checkout Session)"** e defina:
     - `min_amount_cents` (mínimo `100` centavos = R$ 1,00)
     - `max_amount_cents` (teto opcional de segurança)
   - Na aba **Webhook**, configure a `URL do webhook` (`https://seu-sistema.example.com/webhooks/quitou`) e um `Secret` forte para assinatura HMAC-SHA256.
2. **Chave S2S (`Admin → Configurações → Integrações → Chaves de Checkout S2S`)**:
   - Gere uma nova chave informando um rótulo identificável (ex.: `Backend Produção`).
   - Copie o segredo `qtk_...` imediatamente (ele é exibido **uma única vez** e armazenado apenas como hash SHA-256).
   - Opcionalmente, restrinja `allowedProductIds` apenas aos produtos que aquele sistema pode cobrar.

---

## 2. Criando uma sessão de pagamento (Server-to-Server)

A chamada deve partir **exclusivamente do backend** do sistema integrador. Nunca exponha a chave `qtk_...` no frontend ou aplicativo móvel.

### Endpoint

`POST https://<seu-quitou>/api/v1/checkout/sessions`

### Headers

- `Content-Type: application/json`
- `x-api-key: qtk_...` (ou `Authorization: Bearer qtk_...`)
- `Idempotency-Key: <chave-unica-por-tentativa>` *(recomendado para evitar sessões duplicadas em retries)*

### Exemplo A — Valor dinâmico (`pricingMode: "custom"`)

Ideal para cobranças proporcionais (pró-rata), faturas sob medida ou taxas avulsas calculadas no servidor de origem:

```json
{
  "productSlug": "addon-premium",
  "pricingMode": "custom",
  "amountCents": 4790,
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_123",
    "externalOrderId": "ord_987",
    "targetExpiresAt": "2027-08-15T23:59:59.000Z"
  },
  "successUrl": "https://seu-sistema.example.com/pagamento/sucesso",
  "cancelUrl": "https://seu-sistema.example.com/pagamento/cancelado",
  "expiresInMinutes": 60
}
```

### Exemplo B — Catálogo (`pricingMode: "catalog"`)

Ideal para usar planos já configurados no Quitou (opcionalmente travando um plano com `priceRef`):

```json
{
  "productSlug": "assinatura-pro",
  "pricingMode": "catalog",
  "priceRef": "assinatura-pro-anual",
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_123"
  },
  "expiresInMinutes": 120
}
```

### Resposta (`201 Created` ou `200 OK` em replay idempotente)

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "checkoutUrl": "https://seu-quitou/pagar/9xK2...",
  "reused": false,
  "expiresAt": "2026-11-19T01:00:00.000Z",
  "pricingMode": "custom",
  "amountCents": 4790
}
```

Redirecione o usuário para `checkoutUrl` (ou envie o link por e-mail/WhatsApp).

---

## 3. Experiência do comprador em `/pagar/[token]`

- **Sem login global no Quitou:** o link não cria sessão de conta (`quitou_token`) nem dá acesso ao histórico (`/profile`) do comprador no Quitou.
- **Identidade (`emailVerifiedByOrigin`):**
  - Envie `emailVerifiedByOrigin: true` **apenas** quando o sistema de origem já autenticou aquele usuário e garantiu a posse do e-mail.
  - Se `emailVerifiedByOrigin` for `false` (ou ausente), ou se o comprador alterar o e-mail na tela, o Quitou exigirá confirmação por **código de 6 dígitos** enviado ao e-mail antes de concluir o pagamento.
- **Coleta de CPF:**
  - Se o e-mail já possuir CPF cadastrado no Quitou e `emailVerifiedByOrigin: true`, o comprador paga direto sem digitar CPF novamente.
  - Caso contrário, o formulário solicita e valida os 11 dígitos do CPF para envio ao gateway.
  - Um CPF já cadastrado nunca é exposto no `GET` da sessão nem pode ser sobrescrito sem verificação por código.
- **Valor travado:** o `amountCents` exibido e cobrado vem exclusivamente da sessão gravada no servidor; qualquer tentativa de adulteração no navegador é ignorada.

---

## 4. Recebendo a confirmação via Webhook (HMAC-SHA256)

**Nunca** libere acesso ou benefícios com base apenas no redirecionamento para `successUrl`. Sempre aguarde o webhook `POST` enviado pelo Quitou para a `URL do webhook` do produto.

### Headers enviados pelo Quitou

- `X-Quitou-Event: payment.confirmed`
- `X-Quitou-Event-Id: evt_<orderId>_<sessionId>`
- `X-Quitou-Signature: sha256=<hmac-hex>` *(quando `webhook_secret` está configurado)*

### Payload exemplo

```json
{
  "event": "payment.confirmed",
  "eventId": "evt_ord123_sess456",
  "occurredAt": "2026-11-19T00:15:00.000Z",
  "checkoutSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "amountCents": 4790,
  "subject": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente"
  },
  "product": {
    "id": "prod-uuid",
    "ref": "addon-premium",
    "name": "Add-on Premium"
  },
  "order": {
    "id": "ord-uuid",
    "amountCents": 4790,
    "paymentMethod": "PIX",
    "paymentGateway": "pagarme"
  },
  "metadata": {
    "externalUserId": "usr_123",
    "externalOrderId": "ord_987",
    "targetExpiresAt": "2027-08-15T23:59:59.000Z"
  }
}
```

### Checklist do receptor no sistema externo

1. Leia o **corpo bruto (raw body)** da requisição antes de fazer `JSON.parse`.
2. Calcule `HMAC-SHA256(rawBody, webhookSecret)` e compare com `X-Quitou-Signature` (removendo o prefixo `sha256=`) usando comparação em tempo constante (`crypto.timingSafeEqual`).
3. Garanta **idempotência** usando `eventId` (ou `checkoutSessionId`) para não processar a mesma liberação duas vezes em caso de retry.
4. Após o pagamento confirmado, o Quitou marca a sessão como `completed` e o link `/pagar/[token]` passa a retornar `410 Gone`.
