export function buildIntegrationManualMarkdown(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '')

  return `# Manual Técnico de Integração — Quitou

Este manual explica **o que é**, **como funciona** e **como implementar** integrações seguras entre sistemas externos (SaaS, plataformas de ensino, ERPs, bots ou agentes) e esta instância do **Quitou**.

---

## 1. Visão Geral da Arquitetura (Agnóstica)

O Quitou atua como **orquestrador de checkout, identidade fiscal (CPF), envio de e-mails e confirmação via webhook**. Sistemas externos não precisam implementar gateways de pagamento (Pagar.me / Asaas) nem duplicar formulários de cartão/PIX.

Existem **três mecanismos de conexão** no painel **Configurações**:

| Mecanismo | Onde configurar | Para que serve |
| :--- | :--- | :--- |
| **Chaves de Checkout S2S (\`qtk_...\`)** | *Integrações & IA → Chaves de Checkout S2S* | Seu backend cria sessões temporárias (\`/pagar/[token]\`) com preço de catálogo ou valor dinâmico (ex.: pró-rata). |
| **Chave de Consulta por Preço** | *Integrações & IA → Chaves de integração* | Consulta autenticada de produto/preço por ID (\`/api/products/by-price/[priceId]\`). |
| **MCP (Agentes IA — OAuth / PAT)** | *Configurações → MCP (Agentes IA)* | Permite que agentes de IA leiam/gerenciem catálogo, pedidos e configurações conforme política hierárquica. |

> **Regra de ouro:** chaves S2S (\`qtk_...\`) e segredos de webhook **nunca** devem ir para o frontend, navegador ou app mobile. Toda criação de sessão acontece **server-to-server (backend → Quitou)**.

---

## 2. Pré-requisitos no Admin do Quitou

1. **Configurar o Produto (\`Admin → Produtos\`)**:
   - Crie ou edite o produto e defina sua referência única (\`ref\`, ex.: \`addon-mensal\` ou \`plano-pro\`).
   - **Se for usar valor dinâmico / pró-rata (\`pricingMode: "custom"\`)**:
     - Ative **"Permitir valor flexível via API (Checkout Session)"**.
     - Defina \`min_amount_cents\` (piso mínimo obrigatório, mínimo \`100\` centavos = R$ 1,00) e \`max_amount_cents\` (teto opcional contra bugs no sistema chamador).
   - **Na aba Webhook do produto**:
     - Preencha a \`URL do webhook\` (\`https://seu-sistema.example.com/api/webhooks/quitou\`).
     - Defina um \`Secret\` forte (usado na assinatura \`HMAC-SHA256\`).
2. **Emitir Chave S2S (\`Configurações → Integrações & IA → Chaves de Checkout S2S\`)**:
   - Informe um rótulo (ex.: \`Backend Produção\`) e gere a chave \`qtk_...\`.
   - **Copie imediatamente:** o segredo em texto puro é exibido **uma única vez** e armazenado no banco apenas como hash \`SHA-256\`.
   - Se desejar, restrinja \`allowedProductIds\` apenas aos produtos autorizados para aquela integração.

---

## 3. Como Implementar Cobrança Pró-Rata e Valor Dinâmico (\`pricingMode: "custom"\`)

### Por que o cálculo fica no sistema de origem?

Cada negócio possui sua própria regra de ciclo (anual, semestral, carência, piso mínimo, arredondamento). Para manter o Quitou agnóstico:
- **O backend do sistema de origem** calcula o \`amountCents\` exato com base na assinatura principal do usuário.
- **O Quitou** valida o \`amountCents\` contra \`[min_amount_cents, max_amount_cents]\`, gera um link assinado de uso único (\`/pagar/[token]\`), trava o valor no servidor e devolve o \`metadata\` intacto via webhook HMAC após o pagamento.

### Fórmula recomendada de Pró-Rata (no seu backend)

\`\`\`ts
// Exemplo no backend do sistema de origem (Node / TypeScript)
const DAY_MS = 86_400_000

export function calcularValorProRataCents(params: {
  basePriceCents: number     // Ex.: 36000 (R$ 360,00/ano)
  basePeriodDays: number     // Ex.: 365
  minChargeCents: number     // Ex.: 1000 (R$ 10,00 piso mínimo)
  targetExpiresAt: Date      // Data de vencimento da assinatura principal
  now?: Date
}): { amountCents: number; remainingDays: number } {
  const now = params.now ?? new Date()
  const diffMs = params.targetExpiresAt.getTime() - now.getTime()
  const remainingDays = Math.max(1, Math.ceil(diffMs / DAY_MS))

  const raw = Math.round(params.basePriceCents * (remainingDays / params.basePeriodDays))
  const amountCents = Math.min(params.basePriceCents, Math.max(params.minChargeCents, raw))

  return { amountCents, remainingDays }
}
\`\`\`

### Chamada S2S para criar a Checkout Session

\`POST ${cleanBase}/api/v1/checkout/sessions\`

**Headers obrigatórios / recomendados:**
- \`Content-Type: application/json\`
- \`x-api-key: qtk_sua_chave_aqui\` *(ou \`Authorization: Bearer qtk_...\`)*
- \`Idempotency-Key: prorata_<userId>_<targetExpiresAt>\` *(evita sessões duplicadas em retries)*

**Body (Modo \`custom\` — Pró-Rata ou valor sob medida):**

\`\`\`json
{
  "productSlug": "addon-mensal",
  "pricingMode": "custom",
  "amountCents": 18500,
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_9f8a",
    "addonKey": "companion",
    "targetExpiresAt": "2027-08-15T23:59:59.000Z"
  },
  "successUrl": "https://seu-sistema.example.com/pagamento/sucesso",
  "cancelUrl": "https://seu-sistema.example.com/pagamento/cancelado",
  "expiresInMinutes": 60
}
\`\`\`

---

## 4. Como Usar Produtos de Catálogo (\`pricingMode: "catalog"\`)

Se você quiser gerar um link autenticado para um produto que já possui planos fixos cadastrados no Quitou (ex.: Mensal vs Anual):

- **Com plano pré-selecionado:** envie \`"pricingMode": "catalog"\` e \`"priceRef": "plano-pro-anual"\`.
- **Deixando o cliente escolher o plano na tela:** envie \`"pricingMode": "catalog"\` sem \`priceRef\`.

\`\`\`json
{
  "productSlug": "plano-pro",
  "pricingMode": "catalog",
  "priceRef": "plano-pro-anual",
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_9f8a"
  },
  "expiresInMinutes": 120
}
\`\`\`

### Resposta do Quitou (\`201 Created\` ou \`200 OK\` em replay idempotente)

\`\`\`json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "checkoutUrl": "${cleanBase}/pagar/9xK2...token256bits...",
  "reused": false,
  "expiresAt": "2026-11-19T01:00:00.000Z",
  "pricingMode": "custom",
  "amountCents": 18500
}
\`\`\`

Redirecione o comprador para \`checkoutUrl\`.

---

## 5. Identidade do Comprador, E-mail e Coleta de CPF em \`/pagar/[token]\`

O comprador **não precisa criar conta nem fazer login no Quitou**, mas a segurança da identidade segue três regras rígidas:

1. **\`emailVerifiedByOrigin: true\`**: use **somente** quando o usuário já está autenticado no seu sistema e você garante que aquele e-mail é dele.
   - Se o e-mail já tiver CPF salvo no Quitou: o cliente paga direto (sem pedir CPF nem código).
   - Se ainda não tiver CPF no Quitou: a tela solicita e valida os 11 dígitos do CPF antes de enviar ao gateway.
2. **\`emailVerifiedByOrigin: false\` (ou usuário editou o e-mail na tela)**:
   - O Quitou exige confirmação por **código de 6 dígitos** enviado ao e-mail antes de concluir a cobrança.
   - Um CPF já existente em um perfil do Quitou **nunca** é retornado no \`GET\` (\`requiresCpf\` é apenas booleano) e **nunca** é sobrescrito sem verificação por código.
3. **Isolamento de sessão**:
   - Pagar em \`/pagar/[token]\` **nunca** emite cookie de sessão global (\`quitou_token\`) e **nunca** dá acesso a \`/profile\` ou histórico de pedidos anteriores.

---

## 6. Blindagem de Segurança (O que o Quitou garante no servidor)

- **Tokens e Chaves:** tanto a API key (\`key_hash\`) quanto o token da URL (\`token_hash\`) têm 256 bits de entropia e são salvos apenas como **SHA-256** no PostgreSQL.
- **Anti-tampering de preço:** ao submeter o pagamento, qualquer \`amountCents\`, \`productId\` ou \`metadata\` enviado pelo navegador é ignorado — o servidor lê exclusivamente da \`checkout_session\` travada com \`FOR UPDATE\`.
- **Uso único e expiração:** \`expiresInMinutes\` é limitado entre \`15\` e \`1440\` minutos. Após o pagamento confirmado no webhook, a sessão passa atomicamente para \`completed\` e o link passa a retornar \`410 Gone\`.
- **Anti-SSRF e Open-Redirect:** \`successUrl\` e \`cancelUrl\` aceitam apenas \`https://\` públicos (bloqueando \`javascript:\`, \`data:\` e IPs privados).
- **Headers de privacidade:** \`GET /api/checkout/sessions/[token]\` e \`/pagar/[token]\` enviam \`Cache-Control: no-store\` e \`Referrer-Policy: no-referrer\`.

---

## 7. Recebendo e Validando o Webhook de Confirmação (HMAC-SHA256)

**Nunca libere acesso pelo redirecionamento de \`successUrl\`.** Libere o produto/add-on apenas após receber e validar o \`POST\` enviado pelo Quitou para a \`URL do webhook\` do produto.

### Headers recebidos

- \`X-Quitou-Event\`: \`payment.confirmed\`
- \`X-Quitou-Event-Id\`: \`evt_<orderId>_<sessionId>\`
- \`X-Quitou-Signature\`: \`sha256=<hmac_hex>\`

### Payload recebido

\`\`\`json
{
  "event": "payment.confirmed",
  "eventId": "evt_ord123_sess456",
  "occurredAt": "2026-11-19T00:15:00.000Z",
  "checkoutSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "amountCents": 18500,
  "subject": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente"
  },
  "product": {
    "id": "prod-uuid",
    "ref": "addon-mensal",
    "name": "Add-on Mensal"
  },
  "order": {
    "id": "ord-uuid",
    "amountCents": 18500,
    "paymentMethod": "PIX",
    "paymentGateway": "pagarme"
  },
  "metadata": {
    "externalUserId": "usr_9f8a",
    "addonKey": "companion",
    "targetExpiresAt": "2027-08-15T23:59:59.000Z"
  }
}
\`\`\`

### Código de verificação no seu receptor (Node / TypeScript)

\`\`\`ts
import crypto from 'node:crypto'

export function verificarAssinaturaQuitou(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const receivedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  const a = Buffer.from(receivedHex, 'hex')
  const b = Buffer.from(expectedHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
\`\`\`

> **Idempotência no receptor:** sempre registre \`eventId\` (ou \`checkoutSessionId\`) em uma tabela/constraint única no seu sistema para garantir que reenvios do webhook não concedam o benefício duas vezes.

---

## 8. Direct Checkout S2S (1-Step: \`POST /api/v1/checkout/direct\`)

Quando o sistema externo já coletou (ou já possui no cadastro) **plano/valor, CPF/CNPJ, endereço e forma de pagamento (\`PIX\`, \`CREDIT_CARD\` ou \`BOLETO\`)**, é possível criar a sessão, o pedido e o link direto de pagamento em **uma única chamada server-to-server**:

\`POST ${cleanBase}/api/v1/checkout/direct\`

\`\`\`json
{
  "productSlug": "plano-pro",
  "pricingMode": "catalog",
  "priceRef": "plano-pro-anual",
  "billingType": "PIX",
  "installments": 1,
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "document": "12345678909",
    "emailVerifiedByOrigin": true,
    "address": {
      "cep": "01310100",
      "street": "Av. Paulista",
      "number": "1000",
      "city": "Sao Paulo",
      "state": "SP"
    }
  },
  "metadata": {
    "externalUserId": "usr_9f8a",
    "externalOrderId": "ord_456"
  }
}
\`\`\`

### Resposta (Zero PII — nunca devolve CPF, CNPJ ou endereço)

\`\`\`json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "orderId": "order-uuid",
  "paymentId": "pay-uuid",
  "paymentUrl": "https://gateway.example.com/pay/...",
  "checkoutUrl": "https://gateway.example.com/pay/...",
  "amountCents": 18500,
  "expiresAt": "2026-11-19T01:00:00.000Z",
  "reused": false
}
\`\`\`

> **Regras fiscais no Direct Checkout:** \`customer.document\` (CPF 11 dígitos ou CNPJ 14 dígitos) é obrigatório para criar clientes novos no gateway; \`customer.address\` é opcional para PIX/Cartão e **obrigatório** quando \`billingType === "BOLETO"\`.

---

## 9. Atualização em Tempo Real na Tela via SSE (\`text/event-stream\`)

Enquanto o **Webhook (\`payment.confirmed\`)** avisa o seu **backend**, o **SSE** avisa a **tela do usuário** no momento em que o pagamento for confirmado (ideal para PIX):

- **Público (por token da sessão):** \`GET ${cleanBase}/api/checkout/sessions/<token>/events\`
- **Server-to-Server (por \`sessionId\` com \`x-api-key\`):** \`GET ${cleanBase}/api/v1/checkout/sessions/<sessionId>/events\`

\`\`\`ts
// Exemplo no frontend ou BFF ouvindo SSE sem expor PII
const es = new EventSource('/api/payments/status-stream?sessionId=' + sessionId)
es.addEventListener('status', (evt) => {
  const data = JSON.parse(evt.data) // { status, paid, amountCents, completedAt, successUrl }
  if (data.paid) {
    es.close()
    window.location.href = '/pagamento/confirmado'
  }
})
\`\`\`

---

## 10. Como Criar o Mini Plugin de Conexão no Sistema Externo

Para manter rastreabilidade e nunca perder chamadas ou webhooks no seu sistema, crie duas tabelas simples no banco do sistema consumidor:

\`\`\`sql
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id text NOT NULL,
  product_slug text NOT NULL,
  pricing_mode text NOT NULL,
  amount_cents integer NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  quitou_session_id uuid,
  quitou_order_id uuid,
  payment_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | paid | expired
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  event_id text PRIMARY KEY,
  quitou_session_id uuid,
  received_at timestamptz NOT NULL DEFAULT now()
);
\`\`\`

### Fluxo completo do Mini Plugin (4 passos)

1. **Criar intenção local:** grave uma linha em \`payment_intents\` com \`idempotency_key\` único antes de chamar o Quitou.
2. **Chamar o Quitou S2S:** envie \`POST /api/v1/checkout/sessions\` (modo hospedado) ou \`POST /api/v1/checkout/direct\` (1-step) com \`Idempotency-Key\` e \`x-api-key\`, salvando \`quitou_session_id\` e \`payment_url\`.
3. **Acompanhar na UI via SSE:** conecte sua tela ao stream SSE (via BFF usando \`GET /api/v1/checkout/sessions/[id]/events\`) para mostrar confirmação instantânea ao usuário.
4. **Liberar acesso no Webhook:** no endpoint receptor do webhook, valide \`X-Quitou-Signature\` (HMAC-SHA256), insira \`eventId\` em \`payment_webhook_events\` dentro de uma transação, atualize \`payment_intents.status = 'paid'\` e libere o benefício. Se o seu servidor ficar fora do ar, o Admin do Quitou (\`Admin → Webhooks\`) guarda a entrega em \`webhook_deliveries\` para reenvio seguro com o mesmo \`eventId\`.
`
}
