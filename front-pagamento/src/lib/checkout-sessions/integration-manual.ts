export type IntegrationManualTabId = 'overview' | 'hosted' | 'prorata' | 'direct' | 'webhook-sse'

export interface IntegrationManualTab {
  id: IntegrationManualTabId
  label: string
  summary: string
  markdown: string
}

export function buildIntegrationManualTabs(baseUrl: string): IntegrationManualTab[] {
  const cleanBase = baseUrl.replace(/\/+$/, '')

  return [
    {
      id: 'overview',
      label: 'Visão Geral & Chaves',
      summary: 'Arquitetura agnóstica, pré-requisitos no Admin e tipos de chave de integração.',
      markdown: `# 1. Visão Geral da Arquitetura & Chaves (Quitou)

O **Quitou** atua como orquestrador agnóstico de checkout, identidade fiscal (CPF/CNPJ), reserva de estoque, e-mails transacionais e confirmação via webhook. Sistemas externos não precisam integrar gateways (Pagar.me / Asaas) diretamente.

## Mecanismos de conexão no painel Configurações

| Mecanismo | Onde configurar | Para que serve |
| :--- | :--- | :--- |
| **Chaves de Checkout S2S (\`qtk_...\`)** | *Integrações & IA → Chaves de Checkout S2S* | Backend externo cria sessões (\`/pagar/[token]\`), Direct Checkout (\`/api/v1/checkout/direct\`), consulta espelho do produto e assina SSE S2S. |
| **Chave de Consulta por Preço** | *Integrações & IA → Chaves de integração* | Consulta pontual de produto por \`priceId\` (\`/api/products/by-price/[priceId]\`). |
| **MCP (Agentes IA — OAuth / PAT)** | *Configurações → MCP (Agentes IA)* | Permite que agentes operem catálogo, pedidos e configurações respeitando permissões hierárquicas. |

## Pré-requisitos no Admin do Quitou

1. **Produto (\`Admin → Produtos\`):** configure \`ref\` (slug único), preços/estoque, \`payment_methods\`, \`refund_policy\` (termos de compra) e aba **Webhook** (\`webhook_url\` + \`webhook_secret\`).
2. **Se usar valor dinâmico / pró-rata:** ative **"Permitir valor flexível via API"** e defina piso/teto em Reais.
3. **Chave S2S (\`Configurações → Integrações & IA\`):** gere uma chave \`qtk_...\` (exibida uma única vez, salva como SHA-256) e restrinja \`allowedProductIds\` se desejar.

> **Regra de segurança:** chaves \`qtk_...\` e \`webhook_secret\` ficam **somente no backend** do sistema integrador. Nunca exponha no navegador ou app mobile.
`,
    },
    {
      id: 'hosted',
      label: 'Link Hospedado (/pagar)',
      summary:
        'Enviar usuário logado para pagar no Quitou sem acesso ao /profile e com e-mail travado.',
      markdown: `# 2. Checkout Hospedado (\`POST /api/v1/checkout/sessions\` → \`/pagar/[token]\`)

Ideal quando o usuário clica em **"Pagar agora"** no seu site e abre a página do Quitou em nova aba, já com o e-mail dele vinculado e **sem precisar fazer login no Quitou**.

## Garantias de isolamento e segurança

- **Sem acesso a pedidos anteriores:** abrir \`/pagar/[token]\` **nunca** grava o cookie global \`quitou_token\`. Se o usuário tentar acessar \`/profile\`, recebe \`401\` (para ver pedidos no Quitou, precisa entrar via \`/login\` com código de 6 dígitos).
- **E-mail travado pela origem:** ao enviar \`emailVerifiedByOrigin: true\`, o campo de e-mail aparece travado (\`readOnly\`) na tela e qualquer tentativa de alterar o e-mail no request é bloqueada com \`403\` no servidor.
- **Uso único e expiração:** \`expiresInMinutes\` vai de \`15\` a \`1440\` (padrão \`60\`). Após pago, o link retorna \`410 Gone\`.

## Chamada S2S (Backend → Quitou)

\`POST ${cleanBase}/api/v1/checkout/sessions\`

Headers:
- \`Content-Type: application/json\`
- \`x-api-key: qtk_...\`
- \`Idempotency-Key: <chave-unica>\`

\`\`\`json
{
  "productSlug": "plano-pro",
  "pricingMode": "catalog",
  "priceRef": "plano-pro-anual",
  "customer": {
    "email": "usuario-logado@example.com",
    "name": "Nome do Usuário",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_123"
  },
  "successUrl": "https://seu-sistema.example.com/pagamento/sucesso",
  "cancelUrl": "https://seu-sistema.example.com/pagamento/cancelado",
  "expiresInMinutes": 60
}
\`\`\`

> **Dica:** omita \`priceRef\` no modo \`catalog\` se quiser deixar o usuário escolher entre os planos do produto dentro do \`/pagar/[token]\`.
`,
    },
    {
      id: 'prorata',
      label: 'Pró-Rata & Valor Flexível',
      summary:
        'Cálculo proporcional em centavos no backend de origem e validação piso/teto no Quitou.',
      markdown: `# 3. Cobrança Pró-Rata & Valor Dinâmico (\`pricingMode: "custom"\`)

O Quitou não impõe regras de negócio de ciclos de outros sistemas: **seu backend calcula o \`amountCents\` inteiro** e o Quitou valida contra \`[min_amount_cents, max_amount_cents]\` configurados no produto.

## Fórmula recomendada (no backend do sistema integrador)

\`\`\`ts
const DAY_MS = 86_400_000

export function calcularValorProRataCents(params: {
  basePriceCents: number  // Ex.: 36000 (R$ 360,00/ano)
  basePeriodDays: number  // Ex.: 365
  minChargeCents: number  // Ex.: 1000 (R$ 10,00 piso mínimo)
  targetExpiresAt: Date   // Vencimento da assinatura principal
  now?: Date
}): { amountCents: number; remainingDays: number } {
  const now = params.now ?? new Date()
  const remainingDays = Math.max(
    1,
    Math.ceil((params.targetExpiresAt.getTime() - now.getTime()) / DAY_MS)
  )
  const raw = Math.round(params.basePriceCents * (remainingDays / params.basePeriodDays))
  const amountCents = Math.min(params.basePriceCents, Math.max(params.minChargeCents, raw))
  return { amountCents, remainingDays }
}
\`\`\`

## Exemplo de payload pró-rata (S2S)

Envie para \`POST ${cleanBase}/api/v1/checkout/sessions\` (ou \`/api/v1/checkout/direct\`):

\`\`\`json
{
  "productSlug": "addon-mensal",
  "pricingMode": "custom",
  "amountCents": 11836,
  "customer": {
    "email": "cliente@example.com",
    "name": "Nome do Cliente",
    "emailVerifiedByOrigin": true
  },
  "metadata": {
    "externalUserId": "usr_120",
    "addonKey": "companion",
    "targetExpiresAt": "2027-08-15T23:59:59.000Z"
  }
}
\`\`\`

- Todos os valores na API são **inteiros em centavos** (\`z.number().int().positive()\`), eliminando erros de ponto flutuante.
`,
    },
    {
      id: 'direct',
      label: 'Direct Checkout + Espelho',
      summary: 'Montar modal espelho com estoque/termos e gerar paymentUrl em 1 chamada S2S.',
      markdown: `# 4. Espelho de Checkout + Direct Checkout 1-Step

Use este fluxo quando quiser exibir preços, **estoque real**, meios de pagamento e **termos de compra (\`refund_policy\`)** dentro de um modal no seu próprio sistema, gerando o \`paymentUrl\` direto ao clicar em pagar.

## Passo 1 — Consultar Espelho do Produto (Vitrine / Abertura do Modal)

\`GET ${cleanBase}/api/v1/checkout/products/<productSlug>\` *(header \`x-api-key: qtk_...\`)*

Retorna (sem segredos de webhook):
- \`product.payment_methods\`, \`product.refund_policy\` (termos de compra), \`allow_custom_amount\`, limites.
- \`product.prices[]\` com \`promo_tiers\`, \`stock_cap\`, \`stock_sold\`, **\`stock_reserved\`** e **\`stock_available\`**.

## Passo 2 — Gate de Login + Direct Checkout S2S

1. Se o usuário não estiver logado no seu sistema, peça o login próprio antes de abrir o modal.
2. No backend do seu sistema, **leia \`userId\` e \`email\` exclusivamente da sessão autenticada** (nunca do body do browser) e chame:

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
    "externalUserId": "usr_9f8a"
  }
}
\`\`\`

- **Reserva atômica de estoque:** o Quitou executa \`FOR UPDATE\` em \`payments.prices\` e bloqueia com \`409\` se \`stock_sold + stock_reserved >= stock_cap\`.
- **Zero PII na resposta:** retorna apenas \`{ sessionId, orderId, paymentId, paymentUrl, checkoutUrl, amountCents, expiresAt, reused }\`.
- **Endereço:** opcional para PIX/Cartão, obrigatório para \`BOLETO\`.
`,
    },
    {
      id: 'webhook-sse',
      label: 'Webhook + SSE + Mini Plugin',
      summary:
        'Validação HMAC, tabela local de conexão, entregas com retry e atualização em tempo real.',
      markdown: `# 5. Webhook (HMAC-SHA256) + SSE + Mini Plugin de Conexão

## Webhook de Confirmação (\`payment.confirmed\`)

**Nunca libere acesso pelo \`successUrl\`.** Aguarde o \`POST\` do Quitou na \`webhook_url\` do produto:
- Headers: \`X-Quitou-Event: payment.confirmed\`, \`X-Quitou-Event-Id\`, \`X-Quitou-Signature: sha256=<hex>\`.
- Todas as entregas ficam salvas em \`payments.webhook_deliveries\` (visíveis em **Admin → Webhooks** com botão **Reenviar** mantendo o mesmo \`eventId\`).

\`\`\`ts
import crypto from 'node:crypto'

export function verificarAssinaturaQuitou(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const receivedHex = signatureHeader.slice('sha256='.length)
  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex')
  const a = Buffer.from(receivedHex, 'hex')
  const b = Buffer.from(expectedHex, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
\`\`\`

## Stream SSE em Tempo Real (\`text/event-stream\`)

Para atualizar a tela instantaneamente após pagamento PIX sem expor PII:
- **Público:** \`GET ${cleanBase}/api/checkout/sessions/<token>/events\`
- **S2S (\`x-api-key\`):** \`GET ${cleanBase}/api/v1/checkout/sessions/<sessionId>/events\`

## Tabelas sugeridas no sistema integrador (Mini Plugin)

\`\`\`sql
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id text NOT NULL,
  customer_email text NOT NULL,
  product_slug text NOT NULL,
  pricing_mode text NOT NULL,
  price_ref text,
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
`,
    },
  ]
}

export function buildIntegrationManualMarkdown(baseUrl: string): string {
  return buildIntegrationManualTabs(baseUrl)
    .map((tab) => tab.markdown.trim())
    .join('\n\n---\n\n')
}
