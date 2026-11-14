export interface SeedPrice {
  id: string
  ref: string
  amount: number
  recurring: boolean
  interval: 'month' | 'year' | null
  intervalCount: number | null
  stockLimit: number | null
  metadata: Record<string, unknown>
}

export interface SeedRefundPolicy {
  title: string
  subtitle: string
  sections: Array<{ title: string; content: string; highlighted: boolean }>
  footer: string
  checkout: {
    buttonText: string
    acceptanceText: string
    acceptanceRequired: boolean
  }
}

export interface SeedEmailConfig {
  order_created: {
    subject: string
    heading: string
    paragraphs: string[]
  }
  payment_confirmed: {
    subject: string
    heading: string
    paragraphs: string[]
  }
}

export interface SeedProduct {
  id: string
  ref: string
  name: string
  description: string
  active: boolean
  paymentMethods: string[]
  metadata: Record<string, unknown>
  refundPolicy: SeedRefundPolicy
  emailConfig: SeedEmailConfig
  prices: SeedPrice[]
}

const POLICY_7D: SeedRefundPolicy = {
  title: 'Garantia incondicional de 7 dias',
  subtitle: 'Direito de arrependimento conforme Art. 49 do CDC',
  sections: [
    {
      title: 'Solicitação sem burocracia',
      content:
        'Você pode solicitar o reembolso integral em até 7 dias corridos após a confirmação do pagamento.',
      highlighted: true,
    },
    {
      title: 'Prazo de estorno',
      content:
        'Pagamentos via PIX são estornados em até 1 dia útil. Cartão de crédito conforme o fechamento da fatura.',
      highlighted: false,
    },
  ],
  footer: 'Dúvidas? Fale com suporte@quitou.dev informando o número do pedido.',
  checkout: {
    buttonText: 'Política de garantia (7 dias)',
    acceptanceText: 'Li e concordo com a política de reembolso de 7 dias',
    acceptanceRequired: true,
  },
}

const POLICY_15D: SeedRefundPolicy = {
  title: 'Garantia estendida de 15 dias',
  subtitle: 'Teste a plataforma e os módulos com tranquilidade',
  sections: [
    {
      title: 'Cobertura ampliada',
      content:
        'Se o conteúdo ou plano não atender às suas expectativas nos primeiros 15 dias, devolvemos 100% do valor pago.',
      highlighted: true,
    },
    {
      title: 'Cancelamento de recorrência',
      content:
        'Em assinaturas, o cancelamento interrompe as próximas cobranças imediatamente sem multa.',
      highlighted: false,
    },
  ],
  footer: 'Atendimento prioritário pelo e-mail suporte@quitou.dev.',
  checkout: {
    buttonText: 'Ver garantia de 15 dias',
    acceptanceText: 'Concordo com os termos da garantia estendida de 15 dias',
    acceptanceRequired: true,
  },
}

const POLICY_30D_HIGH_TICKET: SeedRefundPolicy = {
  title: 'Garantia condicionada de 30 dias',
  subtitle: 'Compromisso de resultado para mentorias e planos Enterprise',
  sections: [
    {
      title: 'Elegibilidade',
      content:
        'Após participar das sessões iniciais e aplicar o plano de ação, caso não veja evolução, analisamos o estorno em até 30 dias.',
      highlighted: true,
    },
    {
      title: 'Reagendamento',
      content:
        'Sessões individuais podem ser reagendadas com até 24h de antecedência sem custo adicional.',
      highlighted: false,
    },
  ],
  footer: 'Condições válidas mediante aceite no momento da contratação.',
  checkout: {
    buttonText: 'Termos da garantia de 30 dias',
    acceptanceText: 'Li e aceito as condições de garantia e reagendamento',
    acceptanceRequired: true,
  },
}

const POLICY_EVENT_RESTRICTIVE: SeedRefundPolicy = {
  title: 'Política para eventos e workshops ao vivo',
  subtitle: 'Vagas limitadas com reserva imediata de assento',
  sections: [
    {
      title: 'Cancelamento até 48h antes',
      content:
        'Reembolso integral disponível para solicitações feitas com pelo menos 48 horas de antecedência do evento.',
      highlighted: true,
    },
    {
      title: 'Transferência de titularidade',
      content:
        'Após o prazo de 48h ou após o início da transmissão, não há estorno, mas você pode transferir sua vaga para outra pessoa.',
      highlighted: false,
    },
  ],
  footer: 'Solicitações de transferência devem ser enviadas para eventos@quitou.dev.',
  checkout: {
    buttonText: 'Regras de cancelamento do evento',
    acceptanceText: 'Estou ciente das regras de cancelamento e transferência de vaga',
    acceptanceRequired: true,
  },
}

const POLICY_DIGITAL_INSTANT: SeedRefundPolicy = {
  title: 'Licença digital com entrega imediata',
  subtitle: 'Arquivos e templates liberados integralmente após a compra',
  sections: [
    {
      title: 'Entrega instantânea',
      content:
        'Ao concluir o pagamento via PIX, o pacote completo de código e templates é liberado para download imediato.',
      highlighted: true,
    },
  ],
  footer: 'Suporte técnico para instalação disponível via comunidade.',
  checkout: {
    buttonText: 'Termos da licença digital',
    acceptanceText: 'Concordo com os termos de licença de uso digital',
    acceptanceRequired: false,
  },
}

function makeCourseEmail(courseTitle: string): SeedEmailConfig {
  return {
    order_created: {
      subject: `Seu pedido em ${courseTitle} foi gerado`,
      heading: 'Recebemos seu pedido!',
      paragraphs: [
        'Olá {{customer_name}}, registramos seu pedido #{{order_id}} para {{product_name}} no valor de {{amount}}.',
        'Assim que o pagamento via {{payment_method}} for compensado, enviaremos seu link exclusivo de acesso.',
      ],
    },
    payment_confirmed: {
      subject: `Acesso liberado — ${courseTitle}`,
      heading: 'Bem-vindo(a) ao curso!',
      paragraphs: [
        'Olá {{customer_name}}, seu pagamento de {{amount}} foi confirmado com sucesso.',
        'Acesse a área de alunos com seu e-mail cadastrado para começar imediatamente.',
      ],
    },
  }
}

function makeSaasEmail(planTitle: string): SeedEmailConfig {
  return {
    order_created: {
      subject: `Assinatura ${planTitle} — aguardando confirmação`,
      heading: 'Estamos preparando seu workspace',
      paragraphs: [
        'Olá {{customer_name}}, sua assinatura {{product_name}} ({{amount}}) foi iniciada.',
        'Conclua o pagamento via {{payment_method}} para ativar sua conta imediatamente.',
      ],
    },
    payment_confirmed: {
      subject: `Assinatura ativa — ${planTitle}`,
      heading: 'Sua assinatura está ativa!',
      paragraphs: [
        'Olá {{customer_name}}, confirmamos o pagamento de {{amount}} referente ao plano {{product_name}}.',
        'Seu painel já está liberado com todos os recursos contratados.',
      ],
    },
  }
}

function makeEventEmail(eventTitle: string): SeedEmailConfig {
  return {
    order_created: {
      subject: `Pré-reserva de vaga — ${eventTitle}`,
      heading: 'Sua vaga está pré-reservada',
      paragraphs: [
        'Olá {{customer_name}}, reservamos temporariamente seu lugar em {{product_name}} ({{amount}}).',
        'Finalize o pagamento via {{payment_method}} para garantir seu ingresso antes que as vagas acabem.',
      ],
    },
    payment_confirmed: {
      subject: `Ingresso confirmado — ${eventTitle}`,
      heading: 'Sua vaga está garantida!',
      paragraphs: [
        'Olá {{customer_name}}, pagamento confirmado ({{amount}}).',
        'Guarde este e-mail: o link de credenciamento e calendário foi anexado ao seu perfil.',
      ],
    },
  }
}

function makeServiceEmail(serviceTitle: string): SeedEmailConfig {
  return {
    order_created: {
      subject: `Solicitação recebida — ${serviceTitle}`,
      heading: 'Pedido registrado',
      paragraphs: [
        'Olá {{customer_name}}, recebemos sua contratação de {{product_name}} no valor de {{amount}}.',
        'Nossa equipe iniciará o agendamento assim que o pagamento via {{payment_method}} for confirmado.',
      ],
    },
    payment_confirmed: {
      subject: `Contratação confirmada — ${serviceTitle}`,
      heading: 'Tudo pronto para começarmos!',
      paragraphs: [
        'Olá {{customer_name}}, confirmamos o pagamento de {{amount}}.',
        'Você receberá o link da agenda para escolher o melhor horário nas próximas horas.',
      ],
    },
  }
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: '11000001-0000-4000-8000-000000000001',
    ref: 'formacao-nextjs-fullstack',
    name: 'Formação Full-Stack Next.js',
    description: 'Curso completo de Next.js App Router, TypeScript, Postgres e pagamentos reais.',
    active: true,
    paymentMethods: ['credit_card', 'pix', 'boleto'],
    metadata: { admin_group: 'Cursos', category: 'course' },
    refundPolicy: POLICY_7D,
    emailConfig: makeCourseEmail('Formação Full-Stack Next.js'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000001',
        ref: 'formacao-nextjs-vitalicio',
        amount: 69700,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Acesso vitalício', access_months: 120 },
      },
      {
        id: '22000001-0000-4000-8000-000000000002',
        ref: 'formacao-nextjs-anual',
        amount: 49700,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Acesso 12 meses', access_months: 12 },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000002',
    ref: 'masterclass-arquitetura-saas',
    name: 'Masterclass Arquitetura SaaS',
    description: 'Multi-tenancy, filas, observabilidade e billing recorrente em produção.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Cursos', category: 'course' },
    refundPolicy: POLICY_15D,
    emailConfig: makeCourseEmail('Masterclass Arquitetura SaaS'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000003',
        ref: 'masterclass-saas-unica',
        amount: 39700,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Turma gravada + código', access_months: 24 },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000003',
    ref: 'quitou-cloud-starter',
    name: 'Quitou Cloud Starter',
    description: 'Plano inicial para infoprodutores com checkout hospedado e webhooks.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Assinaturas SaaS', tier: 'starter' },
    refundPolicy: POLICY_7D,
    emailConfig: makeSaasEmail('Quitou Cloud Starter'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000004',
        ref: 'cloud-starter-mensal',
        amount: 9900,
        recurring: true,
        interval: 'month',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Starter Mensal', interval_label: 'mês' },
      },
      {
        id: '22000001-0000-4000-8000-000000000005',
        ref: 'cloud-starter-anual',
        amount: 99000,
        recurring: true,
        interval: 'year',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Starter Anual (2 meses grátis)', interval_label: 'ano' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000004',
    ref: 'quitou-cloud-pro',
    name: 'Quitou Cloud Pro',
    description: 'Multi-gateway Asaas + Pagar.me, cupons avançados, upsell e automação MCP.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Assinaturas SaaS', tier: 'pro' },
    refundPolicy: POLICY_15D,
    emailConfig: makeSaasEmail('Quitou Cloud Pro'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000006',
        ref: 'cloud-pro-mensal',
        amount: 24900,
        recurring: true,
        interval: 'month',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Pro Mensal', interval_label: 'mês' },
      },
      {
        id: '22000001-0000-4000-8000-000000000007',
        ref: 'cloud-pro-anual',
        amount: 249000,
        recurring: true,
        interval: 'year',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Pro Anual', interval_label: 'ano' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000005',
    ref: 'quitou-cloud-enterprise',
    name: 'Quitou Cloud Enterprise',
    description: 'SLA dedicado, ambiente isolado, auditoria estendida e suporte de engenharia.',
    active: true,
    paymentMethods: ['credit_card', 'boleto'],
    metadata: { admin_group: 'Assinaturas SaaS', tier: 'enterprise' },
    refundPolicy: POLICY_30D_HIGH_TICKET,
    emailConfig: makeSaasEmail('Quitou Cloud Enterprise'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000008',
        ref: 'cloud-enterprise-anual',
        amount: 890000,
        recurring: true,
        interval: 'year',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Enterprise Anual', interval_label: 'ano' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000006',
    ref: 'workshop-design-system-baseui',
    name: 'Workshop Ao Vivo: Design System Base UI',
    description: 'Sábado intensivo de 6h construindo tokens, sheets e tabelas acessíveis.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Eventos & Workshops', format: 'online-live' },
    refundPolicy: POLICY_EVENT_RESTRICTIVE,
    emailConfig: makeEventEmail('Workshop Design System Base UI'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000009',
        ref: 'workshop-baseui-ingresso',
        amount: 19700,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: 40,
        metadata: { label: 'Ingresso Individual (Ao vivo + Gravação)' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000007',
    ref: 'imersao-presencial-sp',
    name: 'Imersão Presencial São Paulo',
    description: 'Dois dias presenciais na Paulista focados em escala de produtos digitais.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Eventos & Workshops', format: 'in-person' },
    refundPolicy: POLICY_EVENT_RESTRICTIVE,
    emailConfig: makeEventEmail('Imersão Presencial São Paulo'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000010',
        ref: 'imersao-sp-standard',
        amount: 149000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: 25,
        metadata: { label: 'Ingresso Standard' },
      },
      {
        id: '22000001-0000-4000-8000-000000000011',
        ref: 'imersao-sp-vip',
        amount: 249000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: 10,
        metadata: { label: 'Ingresso VIP + Jantar' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000008',
    ref: 'mentoria-arquitetura-escala',
    name: 'Mentoria Individual Arquitetura & Escala',
    description: 'Programa de 8 semanas com acompanhamento 1:1 para CTOs e Tech Leads.',
    active: true,
    paymentMethods: ['credit_card'],
    metadata: { admin_group: 'Mentorias', high_ticket: true },
    refundPolicy: POLICY_30D_HIGH_TICKET,
    emailConfig: makeServiceEmail('Mentoria Individual Arquitetura & Escala'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000012',
        ref: 'mentoria-escala-8sem',
        amount: 490000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: 12,
        metadata: { label: 'Programa 8 semanas (até 12x)' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000009',
    ref: 'kit-templates-checkout',
    name: 'Kit Templates Checkout & E-mails',
    description: 'Pacote com 12 templates prontos de checkout e e-mails transacionais responsivos.',
    active: true,
    paymentMethods: ['pix'],
    metadata: { admin_group: 'Produtos Digitais', delivery: 'instant' },
    refundPolicy: POLICY_DIGITAL_INSTANT,
    emailConfig: makeCourseEmail('Kit Templates Checkout & E-mails'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000013',
        ref: 'kit-templates-unico',
        amount: 7900,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Licença individual' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000010',
    ref: 'addon-consultoria-onboarding',
    name: 'Add-on: Consultoria de Onboarding 2h',
    description: 'Sessão prática de 2h para configurar gateways, SMTP e webhooks em produção.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Add-ons & Serviços', is_addon: true },
    refundPolicy: POLICY_7D,
    emailConfig: makeServiceEmail('Consultoria de Onboarding 2h'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000014',
        ref: 'addon-onboarding-2h',
        amount: 29000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Sessão 2h' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000011',
    ref: 'addon-suporte-prioritario-90d',
    name: 'Add-on: Suporte Prioritário Slack 90 dias',
    description: 'Canal privado no Slack com SLA de resposta de 2h em horário comercial.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Add-ons & Serviços', is_addon: true },
    refundPolicy: POLICY_15D,
    emailConfig: makeServiceEmail('Suporte Prioritário Slack 90 dias'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000015',
        ref: 'addon-slack-90d',
        amount: 45000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Pacote 90 dias' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000012',
    ref: 'clube-colibri-comunidade',
    name: 'Clube Colibri Comunidade',
    description: 'Comunidade fechada com calls semanais, code reviews e networking técnico.',
    active: true,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Assinaturas SaaS', category: 'community' },
    refundPolicy: POLICY_7D,
    emailConfig: makeSaasEmail('Clube Colibri Comunidade'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000016',
        ref: 'clube-colibri-mensal',
        amount: 6900,
        recurring: true,
        interval: 'month',
        intervalCount: 1,
        stockLimit: null,
        metadata: { label: 'Mensal', interval_label: 'mês' },
      },
      {
        id: '22000001-0000-4000-8000-000000000017',
        ref: 'clube-colibri-trimestral',
        amount: 17900,
        recurring: true,
        interval: 'month',
        intervalCount: 3,
        stockLimit: null,
        metadata: { label: 'Trimestral', interval_label: 'trimestre' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000013',
    ref: 'ebook-engenharia-pagamentos',
    name: 'E-book Engenharia de Pagamentos',
    description: 'Guia prático sobre idempotência, conciliação, webhooks e anti-fraude no Brasil.',
    active: true,
    paymentMethods: ['credit_card', 'pix', 'boleto'],
    metadata: { admin_group: 'Produtos Digitais', format: 'ebook' },
    refundPolicy: POLICY_7D,
    emailConfig: makeCourseEmail('E-book Engenharia de Pagamentos'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000018',
        ref: 'ebook-pagamentos-pdf',
        amount: 4900,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'PDF + ePub' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000014',
    ref: 'auditoria-seguranca-lgpd',
    name: 'Auditoria Express de Segurança & LGPD',
    description: 'Revisão de código, políticas de privacidade, criptografia e conformidade LGPD.',
    active: true,
    paymentMethods: ['credit_card', 'pix', 'boleto'],
    metadata: { admin_group: 'Serviços B2B', b2b: true },
    refundPolicy: POLICY_15D,
    emailConfig: makeServiceEmail('Auditoria Express de Segurança & LGPD'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000019',
        ref: 'auditoria-lgpd-unica',
        amount: 240000,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Pacote empresa única' },
      },
    ],
  },
  {
    id: '11000001-0000-4000-8000-000000000015',
    ref: 'curso-legado-react17',
    name: 'Curso Legado React 17 (Arquivado)',
    description: 'Turma encerrada mantida apenas para histórico de alunos antigos.',
    active: false,
    paymentMethods: ['credit_card', 'pix'],
    metadata: { admin_group: 'Cursos', archived: true },
    refundPolicy: POLICY_7D,
    emailConfig: makeCourseEmail('Curso Legado React 17'),
    prices: [
      {
        id: '22000001-0000-4000-8000-000000000020',
        ref: 'react17-legado-unico',
        amount: 19900,
        recurring: false,
        interval: null,
        intervalCount: null,
        stockLimit: null,
        metadata: { label: 'Legado' },
      },
    ],
  },
]

export const SEED_UPGRADE_PATHS = [
  {
    id: '33000001-0000-4000-8000-000000000001',
    fromPriceId: '22000001-0000-4000-8000-000000000004', // Starter Mensal
    toPriceId: '22000001-0000-4000-8000-000000000006', // Pro Mensal
    sortOrder: 1,
    metadata: { badge: 'Mais popular' },
  },
  {
    id: '33000001-0000-4000-8000-000000000002',
    fromPriceId: '22000001-0000-4000-8000-000000000006', // Pro Mensal
    toPriceId: '22000001-0000-4000-8000-000000000008', // Enterprise Anual
    sortOrder: 2,
    metadata: { badge: 'SLA Dedicado' },
  },
]

export const SEED_ADDON_OFFERS = [
  {
    id: '44000001-0000-4000-8000-000000000001',
    anchorPriceId: '22000001-0000-4000-8000-000000000001', // Formação Vitalício
    addonPriceId: '22000001-0000-4000-8000-000000000014', // Onboarding 2h
    sortOrder: 1,
    metadata: { headline: 'Adicione 2h de onboarding ao vivo' },
  },
  {
    id: '44000001-0000-4000-8000-000000000002',
    anchorPriceId: '22000001-0000-4000-8000-000000000006', // Cloud Pro Mensal
    addonPriceId: '22000001-0000-4000-8000-000000000015', // Slack 90d
    sortOrder: 1,
    metadata: { headline: 'Inclua suporte prioritário no Slack por 90 dias' },
  },
]

export const SEED_PROMO_TIERS = [
  {
    id: '55000001-0000-4000-8000-000000000001',
    priceId: '22000001-0000-4000-8000-000000000016', // Clube Colibri Mensal
    discountPercent: 25,
    maxUnits: 20,
    unitsSold: 14,
    appliesTo: 'first_payment',
    sortOrder: 1,
  },
  {
    id: '55000001-0000-4000-8000-000000000002',
    priceId: '22000001-0000-4000-8000-000000000009', // Workshop Base UI
    discountPercent: 15,
    maxUnits: 15,
    unitsSold: 15,
    appliesTo: 'all',
    sortOrder: 1,
  },
]

export interface SeedCoupon {
  id: string
  code: string
  description: string
  discountType: 'percent' | 'fixed_amount'
  discountPercent: number | null
  discountAmountCents: number | null
  appliesTo: 'both' | 'one_time' | 'subscription'
  active: boolean
  maxRedemptionsTotal: number | null
  maxRedemptionsPerUser: number | null
  startsOffsetDays: number | null
  endsOffsetDays: number | null
  publicShowRemaining: boolean
  publicShowValidUntil: boolean
  publicMessageBands: Array<{ min_remaining: number; message: string }>
  productIds?: string[]
  priceIds?: string[]
}

export const SEED_COUPONS: SeedCoupon[] = [
  {
    id: '66000001-0000-4000-8000-000000000001',
    code: 'BEMVINDO15',
    description: 'Cupom de boas-vindas com 15% de desconto em todo o catálogo',
    discountType: 'percent',
    discountPercent: 15,
    discountAmountCents: null,
    appliesTo: 'both',
    active: true,
    maxRedemptionsTotal: 200,
    maxRedemptionsPerUser: 2,
    startsOffsetDays: -45,
    endsOffsetDays: 45,
    publicShowRemaining: true,
    publicShowValidUntil: true,
    publicMessageBands: [{ min_remaining: 1, message: 'Restam apenas {remaining} usos!' }],
  },
  {
    id: '66000001-0000-4000-8000-000000000002',
    code: 'PIX50',
    description: 'R$ 50,00 de desconto em cursos e imersões selecionados',
    discountType: 'fixed_amount',
    discountPercent: null,
    discountAmountCents: 5000,
    appliesTo: 'one_time',
    active: true,
    maxRedemptionsTotal: 100,
    maxRedemptionsPerUser: 1,
    startsOffsetDays: -30,
    endsOffsetDays: 30,
    publicShowRemaining: true,
    publicShowValidUntil: false,
    publicMessageBands: [],
    productIds: [
      '11000001-0000-4000-8000-000000000001',
      '11000001-0000-4000-8000-000000000002',
      '11000001-0000-4000-8000-000000000007',
    ],
  },
  {
    id: '66000001-0000-4000-8000-000000000003',
    code: 'CLOUDPRO25',
    description: '25% OFF exclusivo para assinatura Quitou Cloud Pro',
    discountType: 'percent',
    discountPercent: 25,
    discountAmountCents: null,
    appliesTo: 'subscription',
    active: true,
    maxRedemptionsTotal: 50,
    maxRedemptionsPerUser: 1,
    startsOffsetDays: -20,
    endsOffsetDays: 60,
    publicShowRemaining: false,
    publicShowValidUntil: true,
    publicMessageBands: [],
    priceIds: ['22000001-0000-4000-8000-000000000006', '22000001-0000-4000-8000-000000000007'],
  },
  {
    id: '66000001-0000-4000-8000-000000000004',
    code: 'LANCAMENTO30',
    description: 'Campanha de lançamento 30% OFF com vagas limitadas',
    discountType: 'percent',
    discountPercent: 30,
    discountAmountCents: null,
    appliesTo: 'both',
    active: true,
    maxRedemptionsTotal: 30,
    maxRedemptionsPerUser: 1,
    startsOffsetDays: -15,
    endsOffsetDays: 15,
    publicShowRemaining: true,
    publicShowValidUntil: true,
    publicMessageBands: [
      { min_remaining: 1, message: 'Últimas unidades promocionais!' },
      { min_remaining: 10, message: 'Aproveite o lote promocional' },
    ],
  },
  {
    id: '66000001-0000-4000-8000-000000000005',
    code: 'BLACK2025',
    description: 'Campanha encerrada de Black Friday',
    discountType: 'percent',
    discountPercent: 40,
    discountAmountCents: null,
    appliesTo: 'both',
    active: true,
    maxRedemptionsTotal: 100,
    maxRedemptionsPerUser: 1,
    startsOffsetDays: -90,
    endsOffsetDays: -30,
    publicShowRemaining: false,
    publicShowValidUntil: false,
    publicMessageBands: [],
  },
  {
    id: '66000001-0000-4000-8000-000000000006',
    code: 'INATIVO10',
    description: 'Cupom desativado manualmente para testes',
    discountType: 'percent',
    discountPercent: 10,
    discountAmountCents: null,
    appliesTo: 'both',
    active: false,
    maxRedemptionsTotal: null,
    maxRedemptionsPerUser: null,
    startsOffsetDays: null,
    endsOffsetDays: null,
    publicShowRemaining: false,
    publicShowValidUntil: false,
    publicMessageBands: [],
  },
]

export interface SeedCustomer {
  id: string
  name: string
  email: string
  document: string
  phone: string
  personType: 'individual' | 'company'
  companyName: string | null
}

const CUSTOMER_RAW: Array<
  [string, string, string, string, 'individual' | 'company', string | null]
> = [
  ['Mariana Costa', 'mariana.costa@exemplo.dev', '39053344705', '11991234501', 'individual', null],
  [
    'Rafael Almeida',
    'rafael.almeida@exemplo.dev',
    '52998224725',
    '11991234502',
    'individual',
    null,
  ],
  [
    'Camila Ferreira',
    'camila.ferreira@exemplo.dev',
    '11144477735',
    '21991234503',
    'individual',
    null,
  ],
  [
    'Lucas Oliveira',
    'lucas.oliveira@exemplo.dev',
    '71428793860',
    '31991234504',
    'individual',
    null,
  ],
  [
    'Beatriz Santos',
    'beatriz.santos@exemplo.dev',
    '96518274002',
    '41991234505',
    'individual',
    null,
  ],
  ['Thiago Mendes', 'thiago.mendes@exemplo.dev', '28471935008', '51991234506', 'individual', null],
  ['Juliana Rocha', 'juliana.rocha@exemplo.dev', '64829104811', '11992345607', 'individual', null],
  [
    'Gabriel Nogueira',
    'gabriel.nogueira@exemplo.dev',
    '19384756022',
    '21992345608',
    'individual',
    null,
  ],
  [
    'Larissa Carvalho',
    'larissa.carvalho@exemplo.dev',
    '48291038433',
    '31992345609',
    'individual',
    null,
  ],
  [
    'Bruno Teixeira',
    'bruno.teixeira@exemplo.dev',
    '83920194844',
    '41992345610',
    'individual',
    null,
  ],
  ['Fernanda Lima', 'fernanda.lima@exemplo.dev', '12839405855', '61992345611', 'individual', null],
  [
    'Rodrigo Martins',
    'rodrigo.martins@exemplo.dev',
    '37482910466',
    '71992345612',
    'individual',
    null,
  ],
  [
    'Patrícia Duarte',
    'patricia.duarte@exemplo.dev',
    '56473829177',
    '81992345613',
    'individual',
    null,
  ],
  [
    'Felipe Barbosa',
    'felipe.barbosa@exemplo.dev',
    '91827364588',
    '85992345614',
    'individual',
    null,
  ],
  [
    'Amanda Ribeiro',
    'amanda.ribeiro@exemplo.dev',
    '24681357999',
    '11993456715',
    'individual',
    null,
  ],
  [
    'Eduardo Vieira',
    'eduardo.vieira@exemplo.dev',
    '13579246810',
    '19993456716',
    'individual',
    null,
  ],
  ['Vanessa Gomes', 'vanessa.gomes@exemplo.dev', '86420975321', '21993456717', 'individual', null],
  [
    'Gustavo Azevedo',
    'gustavo.azevedo@exemplo.dev',
    '75319086432',
    '48993456718',
    'individual',
    null,
  ],
  [
    'Natália Cardoso',
    'natalia.cardoso@exemplo.dev',
    '64208975343',
    '11994567819',
    'individual',
    null,
  ],
  [
    'Henrique Moreira',
    'henrique.moreira@exemplo.dev',
    '53197864254',
    '31994567820',
    'individual',
    null,
  ],
  ['Aline Freitas', 'aline.freitas@exemplo.dev', '42086753165', '51994567821', 'individual', null],
  ['Diego Correia', 'diego.correia@exemplo.dev', '31975642076', '11995678922', 'individual', null],
  [
    'Isabela Monteiro',
    'isabela.monteiro@exemplo.dev',
    '20864531987',
    '21995678923',
    'individual',
    null,
  ],
  [
    'Marcelo Peixoto',
    'marcelo.peixoto@exemplo.dev',
    '10953420898',
    '41995678924',
    'individual',
    null,
  ],
  [
    'NovaTech Soluções Ltda',
    'financeiro@novatech.exemplo.dev',
    '11222333000181',
    '1130001001',
    'company',
    'NovaTech Soluções Ltda',
  ],
  [
    'Atlas Digital S.A.',
    'compras@atlasdigital.exemplo.dev',
    '22333444000192',
    '1130001002',
    'company',
    'Atlas Digital S.A.',
  ],
  [
    'Vértice Educação Ltda',
    'contato@verticeedu.exemplo.dev',
    '33444555000103',
    '2130001003',
    'company',
    'Vértice Educação Ltda',
  ],
  [
    'Pulse Cloud Tecnologia',
    'billing@pulsecloud.exemplo.dev',
    '44555666000114',
    '3130001004',
    'company',
    'Pulse Cloud Tecnologia',
  ],
  [
    'Horizonte Labs Ltda',
    'ops@horizontelabs.exemplo.dev',
    '55666777000125',
    '4830001005',
    'company',
    'Horizonte Labs Ltda',
  ],
  [
    'Kroma Studio Criativo',
    'adm@kromastudio.exemplo.dev',
    '66777888000136',
    '1130001006',
    'company',
    'Kroma Studio Criativo',
  ],
]

export const SEED_CUSTOMERS: SeedCustomer[] = CUSTOMER_RAW.map((row, idx) => ({
  id: `77000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
  name: row[0],
  email: row[1],
  document: row[2],
  phone: row[3],
  personType: row[4],
  companyName: row[5],
}))
