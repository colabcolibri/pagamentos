import type { RefundPolicyContent } from '@/components/refund-policy/types'

/**
 * Configuração de um email (pedido criado ou pagamento confirmado)
 * Compatível com ProductEmailConfig do email-config-editor
 */
export interface GeneratedEmailConfig {
  from_name: string
  from_email: string
  reply_to?: string
  cc?: string
  subject: string
  custom_message?: string
  instructions?: string
  include_next_steps?: boolean
  next_steps?: string[]
}

export interface GeneratedProductEmailConfig {
  order_created?: GeneratedEmailConfig
  payment_confirmed?: GeneratedEmailConfig
}

/**
 * Schema esperado do JSON gerado pela IA
 */
export interface GeneratedProduct {
  product: {
    name: string
    ref: string
    description: string | null
    active: boolean
    payment_methods: string[]
    refund_policy: RefundPolicyContent | null
    email_config?: GeneratedProductEmailConfig | null
    metadata?: Record<string, unknown> | null
  }
  prices: Array<{
    ref: string
    amount: number
    currency: string
    recurring: boolean
    interval: string | null
    interval_count: number | null
    active: boolean
    metadata?: {
      title?: string
      cash_discount?: number
      max_installments?: number
      lifetime_access?: boolean
      access_months?: number
      success_message?: string
      topics?: Array<{ title: string; content: string[] }>
    } | null
    /** Complemento de email só deste preço; omitir mantém o atual no servidor. */
    email_addon?: Record<string, unknown> | null
  }>
}

export type PriceTypeHint = 'subscription' | 'one_time' | 'both'

/**
 * JSON Schema para Gemini structured output (responseJsonSchema).
 * Garante que a IA retorne JSON válido e com a estrutura esperada.
 */
export const PRODUCT_GENERATION_JSON_SCHEMA = {
  type: 'object',
  description: 'Produto digital com preços e política de reembolso',
  properties: {
    product: {
      type: 'object',
      description: 'Dados do produto',
      properties: {
        name: { type: 'string', description: 'Nome do produto' },
        ref: { type: 'string', description: 'Slug único em minúsculas, hífens' },
        description: { type: ['string', 'null'], description: 'Descrição detalhada ou null' },
        active: { type: 'boolean', description: 'Produto ativo' },
        payment_methods: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ex: credit_card, pix, boleto',
        },
        refund_policy: {
          type: ['object', 'null'],
          description: 'Política de reembolso ou null',
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'array', items: { type: 'string' } },
                  highlighted: { type: 'boolean' },
                },
                required: ['title', 'content'],
              },
            },
            footer: { type: 'string' },
            checkout: {
              type: 'object',
              properties: {
                buttonText: { type: 'string' },
                acceptanceText: { type: 'string' },
                acceptanceRequired: { type: 'string' },
              },
            },
          },
          required: ['title', 'subtitle', 'sections', 'footer', 'checkout'],
        },
        email_config: {
          type: ['object', 'null'],
          description: 'Config de emails (order_created, payment_confirmed) ou null',
          properties: {
            order_created: {
              type: 'object',
              properties: {
                from_name: { type: 'string' },
                from_email: { type: 'string' },
                reply_to: { type: 'string' },
                subject: { type: 'string' },
                custom_message: { type: 'string' },
                instructions: { type: 'string' },
                include_next_steps: { type: 'boolean' },
                next_steps: { type: 'array', items: { type: 'string' } },
              },
              required: ['from_name', 'from_email', 'subject'],
            },
            payment_confirmed: {
              type: 'object',
              properties: {
                from_name: { type: 'string' },
                from_email: { type: 'string' },
                subject: { type: 'string' },
                include_next_steps: { type: 'boolean' },
                next_steps: { type: 'array', items: { type: 'string' } },
              },
              required: ['from_name', 'from_email', 'subject'],
            },
          },
        },
        metadata: { type: ['object', 'null'] },
      },
      required: ['name', 'ref', 'description', 'active', 'payment_methods'],
    },
    prices: {
      type: 'array',
      description: 'Lista de preços do produto',
      minItems: 1,
      items: {
        type: 'object',
        description: 'Um preço ou plano',
        properties: {
          ref: { type: 'string', description: 'Slug único do preço' },
          amount: { type: 'integer', description: 'Valor em centavos' },
          currency: { type: 'string', description: 'Ex: BRL' },
          recurring: { type: 'boolean' },
          interval: { type: ['string', 'null'], description: 'day, week, month, year ou null' },
          interval_count: { type: ['integer', 'null'] },
          active: { type: 'boolean' },
          metadata: {
            type: ['object', 'null'],
            description:
              'title, cash_discount, max_installments, lifetime_access, access_months, topics',
            properties: {
              title: { type: 'string', description: 'Nome exibido (ex: Plano mensal, À vista)' },
              cash_discount: { type: 'number', description: 'Desconto à vista 0-100' },
              max_installments: { type: 'integer', description: 'Parcelas máximas no cartão' },
              lifetime_access: {
                type: 'boolean',
                description:
                  'true = acesso vitalício (pagamento único) ou enquanto assinatura ativa. Quando true, access_months é irrelevante.',
              },
              access_months: {
                type: 'integer',
                description:
                  'Meses de acesso ao produto. Relevante quando lifetime_access é false. Ex: 12 = 12 meses.',
              },
              success_message: {
                type: 'string',
                description:
                  'Mensagem exibida após confirmação do pagamento. Padrão: "Seu pagamento foi confirmado com sucesso."',
              },
              topics: {
                type: 'array',
                description:
                  'Seções de tópicos/características do produto (título + itens), exibidas na página de pagamento',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Ex: O que está incluso' },
                    content: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Lista de itens/características',
                    },
                  },
                  required: ['title', 'content'],
                },
              },
            },
          },
          email_addon: {
            type: ['object', 'null'],
            description:
              'Textos extras de email só deste plano. Omita a chave email_addon inteira se não for alterar (o servidor mantém o atual).',
          },
        },
        required: ['ref', 'amount', 'currency', 'recurring', 'active'],
      },
    },
  },
  required: ['product', 'prices'],
} as const

export interface ProductGenerationInput {
  name: string
  description: string
  priceInfo: string
  /** Indica se o produto deve ter assinatura, preço único ou ambos. Ajuda a IA a gerar os preços corretos. */
  priceType: PriceTypeHint
  objective: string
  policyInfo: string
}

/**
 * Monta o prompt do sistema para geração de produto
 */
export function buildProductGenerationPrompt(_input: ProductGenerationInput): string {
  return `Você é um assistente que gera configurações de produtos digitais para um sistema de pagamentos.

Regra de ouro: priorize FIDELIDADE e COMPLETUDE ao texto. Inclua tudo que estiver explícito (cada preço, cada plano, cada condição de reembolso). Em dúvida, inclua — não omita por resumir.

Com base nas informações fornecidas, retorne APENAS um JSON válido (sem markdown, sem explicações) no formato exato abaixo.

## Formato obrigatório do JSON:

{
  "product": {
    "name": "string - nome do produto",
    "ref": "string - slug único em minúsculas, hífens (ex: curso-react-2024)",
    "description": "string ou null - descrição detalhada",
    "active": true,
    "payment_methods": ["credit_card", "pix", "boleto"],
    "refund_policy": {
      "title": "string - ex: Política de compra",
      "subtitle": "string - ex: Para seu curso online",
      "sections": [
        {
          "title": "string - título da seção",
          "content": ["string - parágrafo 1 (pode usar <strong> para negrito)", "string - parágrafo 2"],
          "highlighted": false
        }
      ],
      "footer": "string - texto do rodapé",
      "checkout": {
        "buttonText": "Ver política de compra",
        "acceptanceText": "Li e aceito a política de compra",
        "acceptanceRequired": "Você precisa aceitar a política de compra para continuar"
      }
    },
    "email_config": {
      "order_created": {
        "from_name": "string - nome da empresa/remetente",
        "from_email": "string - ex: naoresponda@empresa.com",
        "reply_to": "string ou omitir - email para respostas",
        "subject": "string - ex: Pedido criado com sucesso!",
        "custom_message": "string ou omitir",
        "instructions": "string ou omitir - ex: Após o pagamento você receberá o acesso",
        "include_next_steps": false,
        "next_steps": []
      },
      "payment_confirmed": {
        "from_name": "string",
        "from_email": "string",
        "subject": "string - ex: Pagamento confirmado!",
        "include_next_steps": true,
        "next_steps": ["string - ex: Acesse sua conta", "Confira o material"]
      }
    },
    "metadata": null
  },
  "prices": [
    {
      "ref": "string - slug único (ex: mensal, unico, anual)",
      "amount": number - valor em CENTAVOS (ex: 9990 = R$ 99,90). Este é o preço cheio (parcelado).",
      "currency": "BRL",
      "recurring": false ou true,
      "interval": "month" ou "year" ou null (null se recurring=false),
      "interval_count": 1 ou null,
      "active": true,
      "metadata": { "title": "string", "cash_discount": number, "max_installments": number, "lifetime_access": boolean - true=vitalício ou enquanto assinatura, "access_months": number - meses (quando lifetime_access=false), "success_message": "string ou omitir", "topics": [ { "title": "string", "content": ["item 1"] } ] } ou null
    }
  ]
}

## Preços: título, desconto à vista, parcelamento e tópicos
- **title** (em metadata): nome amigável do preço/plano para exibição (ex.: "Plano mensal", "À vista", "Anual", "Básico"). Preencha com um rótulo claro que identifique a opção; se for único, pode ser "Pagamento único" ou o nome do plano.
- O sistema oferece PIX e Boleto à vista (com desconto) e Cartão parcelado. O campo "amount" é o preço cheio (valor de referência parcelado).
- **cash_discount** (em metadata): percentual de desconto para pagamento à vista (PIX/boleto). Se o texto disser "10% de desconto à vista", "à vista com 10% off", "R$ 90 à vista (10% de desconto)", use cash_discount: 10. Se não mencionar desconto à vista, use 0 ou omita.
- **max_installments** (em metadata): número máximo de parcelas no cartão. Se o texto disser "até 12x sem juros", "parcelado em 12x", use max_installments: 12. Se não mencionar, use 12 como padrão razoável ou omita.
- **lifetime_access** (em metadata): opcional. true = acesso vitalício (pagamento único) ou enquanto assinatura ativa. Use true quando o texto disser "acesso vitalício", "acesso enquanto assinatura ativa" ou não mencionar duração.
- **access_months** (em metadata): opcional. Número de meses de acesso. Relevante quando lifetime_access é false. Se o texto disser "12 meses de acesso", "acesso por 1 ano", "6 meses de plataforma", use access_months: 12 (ou 6).
- **topics** (em metadata): opcional. Array de seções com "title" e "content" (array de strings) para características do produto exibidas na página de pagamento (ex.: "O que está incluso", "Benefícios", "O que você recebe"). Use quando o texto descrever itens inclusos, benefícios ou diferenciais por plano; cada seção pode agrupar itens (ex.: title "O que está incluso", content ["Acesso vitalício", "Certificado", "Suporte por e-mail"]). Se não houver lista clara de itens/benefícios, omita ou use null.
- **success_message** (em metadata): opcional. Mensagem exibida após o pagamento ser confirmado. Nem sempre é "acessar o conteúdo" — pode ser "baixar o material", "entrar na plataforma", "receber o link por e-mail", etc. Se o texto indicar claramente o próximo passo pós-pagamento, use success_message (ex.: "Seu pagamento foi confirmado com sucesso. Você já pode acessar o curso." ou "Seu pagamento foi confirmado com sucesso. O link de download será enviado por e-mail."). Se não houver indicação, omita — o sistema usa o padrão "Seu pagamento foi confirmado com sucesso."
- Sempre preencha metadata nos preços: inclua "title" em todos; quando houver informação de desconto ou parcelas, inclua cash_discount e max_installments. Inclua "lifetime_access": true quando vitalício ou assinatura; "access_months" quando duração fixa (ex.: "12 meses" → access_months: 12, lifetime_access: false). Inclua "topics" quando o texto tiver listas de itens inclusos. Inclua "success_message" quando o texto indicar o que o cliente deve fazer após o pagamento.

## Email (email_config)
- Gere "email_config" com "order_created" e "payment_confirmed" para os emails automáticos (pedido criado e pagamento confirmado).
- Use o nome do produto/empresa em from_name; use o e-mail de contato mencionado em política/contato para from_email ou reply_to. Se não houver e-mail no texto, use placeholders como "contato@empresa.com" e "naoresponda@empresa.com".
- order_created: assunto tipo "Pedido criado com sucesso!" ou "Seu pedido foi recebido"; instructions opcional (ex.: "Após o pagamento você receberá o acesso em até 24h").
- payment_confirmed: assunto tipo "Pagamento confirmado!"; include_next_steps: true e next_steps com 2-4 ações (ex.: "Acesse sua conta", "Confira o material", "Entre em contato se tiver dúvidas").
- Se não houver nenhuma informação para inferir e-mails, use email_config: null.

## Regras:
- ref do produto: slug do nome, minúsculas, hífens, sem acentos
- amount: SEMPRE em centavos (R$ 99,90 = 9990, R$ 197 = 19700)
- payment_methods: inclua credit_card, pix, boleto (e asaas_boleto_parcelado se for boleto parcelado)
- description: use o máximo de informação relevante do texto (benefícios, o que está incluso, público-alvo). Pode ser um parágrafo mais longo se houver muitos detalhes — não corte informação importante.
- refund_policy: baseada em TODAS as informações de política/reembolso/garantia/cancelamento do texto. Traduza cada prazo, condição ou contato mencionado em seções. Não omita nenhum prazo ou regra que apareça no texto.
- prices: um item no array para CADA preço ou plano distinto (cada nível A/B/C, cada periodicidade mensal/trimestral/anual, cada opção à vista/parcelado). Nunca resuma vários preços em um só — liste todos. Mínimo 1 preço.
- Respeite o "Tipo de cobrança" informado pelo usuário:
  - "assinatura": apenas preços recorrentes (recurring=true, interval e interval_count)
  - "preço único": apenas preços avulsos (recurring=false, interval e interval_count null)
  - "ambos": pode incluir preço único e um ou mais preços de assinatura
- Se for assinatura: recurring=true e interval (day/week/month/year)
- interval_count: 1 = mensal, 3 = trimestral, 12 = anual

## Antes de retornar (checklist mental):
- O array "prices" tem um item para cada preço/plano/nível encontrado no texto?
- Cada preço tem metadata.title com um nome claro (ex.: Plano mensal, À vista, Anual)?
- Cada preço tem metadata com cash_discount e/ou max_installments quando o texto mencionar desconto à vista ou parcelas?
- Cada preço tem metadata.lifetime_access (true) ou metadata.access_months (número) conforme o texto? Vitalício/assinatura → lifetime_access: true.
- Quando o texto tiver listas de itens inclusos, benefícios ou características, cada preço tem metadata.topics com seções { title, content }?
- Quando o texto indicar o que o cliente faz após o pagamento (acessar, baixar, receber link, etc.), cada preço tem metadata.success_message personalizado?
- email_config tem order_created e payment_confirmed com from_name, from_email e subject (ou email_config: null se não der para inferir)?
- Todas as condições de reembolso, garantia ou cancelamento do texto viraram seções na refund_policy?
- A description reflete os benefícios e detalhes do produto sem perder informação importante?

## Exemplos de política de compra (use como referência de estilo e estrutura):

**Curso online:**
- title: "Política de compra", subtitle: "Para seu curso online"
- Seções: "Cancelamento e reembolso" (7 dias CDC, prazo estendido se houver encontros), "Acesso ao curso", "Como solicitar o cancelamento" (e-mail com assunto específico), "Sobre a compra com boleto parcelado" (highlighted: true se aplicável)
- Usar <strong> em prazos e termos importantes
- footer: "Esta política se aplica a todos os alunos, sem exceção. Transparência é um valor fundamental para nós."

**Produto digital (download):**
- subtitle: "Entenda nossos termos para produtos digitais"
- Seções: "Cancelamento e reembolso" (7 dias, desde que não tenha feito download), "Acesso e download", "Como solicitar o cancelamento"
- footer: "Esta política considera a natureza dos produtos digitais e busca equilibrar os direitos do consumidor com a viabilidade do nosso negócio."

**Assinatura/plataforma:**
- subtitle: "Para sua assinatura do [nome]"
- Seções: "Cancelamento e reembolso" (7 dias, art. 49 CDC), "Como solicitar", "Sobre o acesso à plataforma"
- footer: "Essa política segue o Código de Defesa do Consumidor brasileiro."

**Padrões comuns:**
- checkout: sempre {"buttonText": "Ver política de compra", "acceptanceText": "Li e aceito a política de compra", "acceptanceRequired": "Você precisa aceitar a política de compra para continuar"}
- "Como solicitar": e-mail com assunto claro (ex: "Solicitação de Cancelamento e Reembolso"), processamento em até 7 dias úteis
- Use o e-mail fornecido pelo usuário em "policyInfo"
- highlighted: true em seções que precisam de destaque (ex: boleto parcelado, condições especiais)

**Exemplo completo de refund_policy (produto digital):**
{
  "title": "Política de compra",
  "subtitle": "Entenda nossos termos para produtos digitais",
  "sections": [
    {"title": "Cancelamento e reembolso", "content": ["Você tem <strong>7 dias corridos</strong> após a compra para solicitar o reembolso integral, desde que não tenha feito o download do produto.", "Se o download já foi realizado, o reembolso não será mais possível, pois não há como \\"devolver\\" o produto."]},
    {"title": "Acesso e download", "content": ["O link para download é disponibilizado imediatamente após a confirmação do pagamento.", "Recomendamos que você faça o download e armazene o produto em um local seguro."]},
    {"title": "Como solicitar o cancelamento", "content": ["Envie um e-mail para <strong>contato@empresa.com</strong> com o assunto \\"Solicitação de Cancelamento - Produto Digital\\".", "O processamento será feito em até 7 dias úteis."]}
  ],
  "footer": "Esta política considera a natureza dos produtos digitais e busca equilibrar os direitos do consumidor com a viabilidade do nosso negócio.",
  "checkout": {"buttonText": "Ver política de compra", "acceptanceText": "Li e aceito a política de compra", "acceptanceRequired": "Você precisa aceitar a política de compra para continuar"}
}`
}

/**
 * Monta a mensagem do usuário com os dados do formulário
 */
const PRICE_TYPE_LABELS: Record<ProductGenerationInput['priceType'], string> = {
  subscription: 'Somente assinatura (preços recorrentes)',
  one_time: 'Somente preço único (pagamento avulso)',
  both: 'Ambos (assinatura e preço único)',
}

export function buildProductGenerationUserMessage(input: ProductGenerationInput): string {
  const priceTypeLabel = PRICE_TYPE_LABELS[input.priceType]
  return `Gere o JSON do produto com base nestas informações. Inclua todos os preços/planos mencionados no campo de preço (cada valor, cada opção) no array "prices"; não resuma em poucos itens.

**Nome:** ${input.name}

**Descrição breve:** ${input.description}

**Preço/valor:** ${input.priceInfo}

**Tipo de cobrança:** ${priceTypeLabel}. Gere os preços (array "prices") de acordo com este tipo.

**Objetivo do produto:** ${input.objective}

**Informações sobre política (reembolso, garantia, prazos):** ${input.policyInfo}

Gere também "email_config" (order_created e payment_confirmed) usando o nome do produto e qualquer e-mail de contato mencionado na política. Se não houver e-mail, use placeholders.

Retorne APENAS o JSON, sem markdown, sem \`\`\`json, sem texto adicional.`
}

/**
 * Monta a mensagem do usuário quando o contexto veio de uma URL (ex.: Jina Reader).
 * A IA deve extrair nome, descrição, preços e política do conteúdo e gerar o JSON.
 */
export function buildProductGenerationUserMessageFromScrape(
  scrapedContent: string,
  priceType: PriceTypeHint
): string {
  const priceTypeLabel = PRICE_TYPE_LABELS[priceType]
  return `Extraia do conteúdo abaixo todas as informações do produto e gere o JSON no formato esperado.

Passos sugeridos:
1) Nome do produto/oferta (título ou nome da comunidade/curso/assinatura).
2) Descrição: benefícios, o que está incluso, para quem é — use o máximo de detalhe relevante do texto.
3) Preços: identifique CADA preço ou plano distinto (cada nível, cada opção mensal/trimestral/anual, valores à vista ou parcelados). O array "prices" deve ter um item para cada um — não resuma nem omita nenhum.
4) Política: se o texto mencionar reembolso, garantia, cancelamento, prazos ou contato, traduza em seções da refund_policy. Inclua todos os prazos e condições mencionados.
5) Email: gere email_config (order_created e payment_confirmed) com from_name, from_email e subject; use e-mail de contato do texto se houver.

**Tipo de cobrança:** ${priceTypeLabel}. Gere os preços (array "prices") de acordo com este tipo.

**Conteúdo da página:**

${scrapedContent}

Retorne APENAS o JSON, sem markdown, sem \`\`\`json, sem texto adicional.`
}

const DEFAULT_EDIT_INSTRUCTION = 'Revise tudo com base no conteúdo informado.'

/**
 * Prompt do sistema para edição de produto com IA (mesmo schema de saída que geração).
 */
export function buildProductEditPrompt(): string {
  return `Você é um assistente que REVISA configurações de produtos digitais com base em novo conteúdo.

Ordem de prioridade (quando houver conflito):
1) A instrução do usuário no início e no fim da mensagem — ela manda.
2) O JSON "produto atual" — copie literalmente o que não deva mudar.
3) O conteúdo novo — use para preencher ou atualizar apenas o que a instrução e o contexto permitirem.

Você receberá:
1) Produto atual (JSON): nome, descrição, payment_methods, refund_policy, email_config, metadata; em cada preço: amount, currency, recurring, interval, metadata (title, cash_discount, max_installments, lifetime_access, access_months, success_message, topics), email_addon, e às vezes stock_cap, stock_sold, promo_tiers só como CONTEXTO administrativo.
2) Conteúdo novo (texto ou página).
3) Tipo de cobrança (quando informado): assinatura, preço único ou ambos — use para interpretar planos no texto sem contradizer a estrutura já existente.

Regras de ouro:
- Retorne APENAS um JSON válido: { "product": { ... }, "prices": [ ... ] } (mesmo formato da geração).
- NÃO inclua "id" no product nem "id" em cada preço.
- O array "prices" deve ter EXATAMENTE o mesmo número de itens que o produto atual. Nunca adicione ou remova posições (o backend rejeita). Se a instrução pedir outra quantidade de preços, mantenha a quantidade e adapte só o que couber.
- Se a instrução disser para mudar só alguns campos (ex.: "só descrição e política"), replique os demais campos do JSON atual sem reescrever à toa.
- Não altere amount, currency, recurring, interval, interval_count nem refs salvo a instrução pedir explicitamente mudança de preço/plano.
- Campos stock_cap, stock_sold e promo_tiers no JSON de entrada são informativos: NÃO os inclua na sua resposta (não fazem parte do schema de saída). O servidor preserva estoque e promoções.
- metadata dos preços: mantenha lifetime_access e access_months coerentes com o texto quando houver menção a duração de acesso ou vitalício; atualize topics e success_message quando o conteúdo novo listar benefícios ou próximos passos pós-pagamento.
- email_addon por preço: só preencha ou altere se a instrução ou o conteúdo novo justificarem texto extra de email daquele plano; caso contrário omita a chave email_addon para o servidor manter o atual.
- refund_policy e email_config: mesma estrutura rica da geração (seções, checkout, order_created, payment_confirmed).

Checklist antes de responder:
- Cada posição i do array prices corresponde ao mesmo plano que no JSON atual (mesma ordem).
- Instrução restrita foi respeitada (não inventou mudanças em campos que deviam ficar iguais).
- Nenhum campo administrativo de estoque/promo foi copiado para a saída.

Obrigatório: resposta = um único objeto JSON, JSON.parse válido, sem markdown, sem \`\`\`json, sem comentários // ou /* */, aspas duplas nas strings.`
}

/**
 * Mensagem do usuário para edição: instrução em destaque + produto atual + conteúdo.
 */
export function buildProductEditUserMessage(
  currentProductJson: string,
  content: string,
  instruction: string,
  priceTypeHint?: PriceTypeHint
): string {
  const effectiveInstruction = (instruction || '').trim() || DEFAULT_EDIT_INSTRUCTION
  const priceTypeBlock =
    priceTypeHint != null
      ? `**Tipo de cobrança:** ${PRICE_TYPE_LABELS[priceTypeHint]} — use só para interpretar o texto novo (planos/preços), sem mudar a quantidade de preços nem inventar valores.

`
      : ''
  return `**Instrução (prioridade máxima — siga literalmente; em dúvida, mantenha o JSON atual):**
${effectiveInstruction}

---

${priceTypeBlock}**Produto atual (JSON — preserve o que a instrução não pedir para mudar):**

${currentProductJson}

---

**Conteúdo novo (fonte de fatos para atualizar textos, preços só se a instrução autorizar):**

${content}

---

**Repita a instrução (confirmação):** ${effectiveInstruction}

Retorne APENAS o JSON revisado (product + prices), sem markdown, sem texto antes ou depois. Comece com "{" e termine com "}".`
}
