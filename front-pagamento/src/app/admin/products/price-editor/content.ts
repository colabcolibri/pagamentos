export const CONTENT = {
  title: 'Preços do produto',
  add: 'Adicionar preço',
  empty: 'Nenhum preço configurado. Clique em',
  emptyAction: 'para começar.',
  priceLabel: 'Preço',
  inactive: 'Inativo',
  uniquePayment: 'Pagamento único',
  copyCheckoutLink: 'Copiar link de checkout',
  checkoutLinkCopied: 'Link copiado!',
  intro:
    'Cada item é um plano ou variação. No topo ficam identificação (com ativo), preço e estoque sempre visíveis; abaixo, use os acordeões para o restante.',
  sections: {
    identify: {
      title: 'Identificação e visibilidade',
      description: 'Nome no admin, referência (slug) para URLs e se o preço aparece no checkout.',
    },
    pricing: {
      title: 'Valor e cartão',
      description: 'Preço em reais, desconto à vista (PIX/boleto) e limite de parcelas no cartão.',
    },
    subscription: {
      title: 'Recorrência',
      description: 'Pagamento único ou assinatura com período (mensal, anual, etc.).',
    },
    access: {
      title: 'Acesso do comprador',
      description: 'Duração do acesso ao produto depois da compra (vitalício ou por meses).',
    },
    checkoutCopy: {
      title: 'Mensagem na tela após pagamento',
      description:
        'Texto na página de confirmação do checkout. É diferente dos emails e da aba Emails do produto.',
    },
    emailExtras: {
      title: 'Complementos nos emails',
      description:
        'Somados ao conteúdo da aba Emails do produto. Ideal para link ou aviso só deste plano.',
    },
    emailOrderCreated: {
      title: 'Pedido criado (ainda sem pagamento)',
      description: 'Email enviado com PIX, boleto ou link de pagamento.',
    },
    emailPaymentDone: {
      title: 'Pagamento confirmado',
      description: 'Email após confirmação no gateway.',
    },
    checkoutPage: {
      title: 'Página de pagamento (checkout)',
      description:
        'Seções com título e itens (ex.: “O que está incluso”) mostradas só neste preço na página de pagamento.',
    },
    stock: {
      title: 'Vagas e estoque',
      description:
        'Limite opcional de vendas neste preço (plano). É independente das faixas de promoção. Contador de vendas sobe no pagamento confirmado (pode haver leve corrida).',
    },
    promoTiers: {
      title: 'Faixas de promoção',
      description:
        'Desconto extra até uma data e/ou até vender N unidades nesta faixa (o que ocorrer primeiro). Contadores sobem no pagamento confirmado.',
    },
    relations: {
      title: 'Upgrade e add-ons',
      description:
        'Defina para onde este preço pode “subir” dentro do mesmo produto e quais outros preços podem ser ofertados como opcional (upsell).',
      needSave:
        'Salve o produto pelo menos uma vez após criar este preço para configurar upgrade e add-ons (o preço precisa existir no banco).',
      upgradeTitle: 'Upgrade (mesmo produto)',
      upgradeHint: 'Marque os preços de destino quando o cliente troca de plano neste produto.',
      addonTitle: 'Add-ons / upsell',
      addonHint:
        'Preços opcionais de qualquer produto que podem ser acrescentados à compra a partir deste preço.',
      noSiblings: 'Não há outros preços persistidos neste produto para oferecer upgrade.',
      noCatalog: 'Nenhum outro preço disponível no catálogo (cadastre mais produtos/preços).',
    },
  },
  fields: {
    title: 'Título do preço',
    titlePlaceholder: 'Ex: Plano mensal, À vista, Anual',
    titleHint:
      'Aparece no checkout abaixo do nome do produto e em confirmação (ex.: Plano mensal). Se vazio, só o produto.',
    ref: 'Referência',
    refPlaceholder: 'Ex: mensal-2024',
    refHint: 'Identificador único (slug)',
    amount: 'Valor (R$)',
    amountPlaceholder: '49.90',
    amountHint: 'Valor em reais (PIX/boleto usam este valor com desconto à vista, se informado)',
    recurring: 'Recorrente (assinatura)',
    interval: 'Período',
    intervalCount: 'A cada',
    intervalCountHint: 'Ex: 1 = mensal, 3 = trimestral',
    active: 'Ativo',
    activeHint: 'Apenas preços ativos aparecem no checkout',
    cashDiscount: 'Desconto à vista (%)',
    cashDiscountPlaceholder: '0',
    cashDiscountHint: 'Ex: 10 = 10% de desconto para PIX/boleto. Deixe 0 ou vazio se não houver.',
    cashPricePreview: 'À vista (com desconto)',
    maxInstallments: 'Parcelas máximas (cartão)',
    maxInstallmentsPlaceholder: '12',
    maxInstallmentsHint: 'Ex: 12 = até 12x no cartão. Mínimo 1.',
    installmentPreview: 'Parcela (máx.)',
    pricingSummaryTitle: 'Resumo para o checkout',
    pricingSummaryRegistered: 'Valor cadastrado (lista de preço)',
    pricingSummaryAfterTiers: 'Após faixas de promoção (primeira regra válida)',
    pricingSummaryListAvista: 'Lista à vista (PIX, boleto ou 1x no cartão)',
    pricingSummaryListParcelado: 'Lista parcelado (cartão)',
    pricingSummaryListUnified: 'Lista no checkout (após faixas)',
    pricingSummaryPix: 'PIX ou boleto (valor final)',
    pricingSummaryPixNote: '{n}% de desconto à vista sobre a lista à vista',
    pricingSummaryCard: 'Cartão (parcela máxima)',
    pricingSummaryCardLine: 'Até {n}x de {valor}',
    pricingSummaryCardNote: 'Calculado sobre a lista parcelado.',
    pricingSummaryCardOneX: '1x no cartão = valor da lista parcelado.',
    successMessage: 'Mensagem após confirmação',
    successMessagePlaceholder: 'Seu pagamento foi confirmado com sucesso.',
    successMessageHint:
      'Mensagem exibida após o pagamento ser confirmado. Deixe vazio para o padrão: "Seu pagamento foi confirmado com sucesso."',
    lifetimeAccess: 'Acesso vitalício',
    lifetimeAccessHint:
      'Acesso ilimitado (pagamento único) ou enquanto assinatura ativa. Desmarque para definir meses.',
    accessMonths: 'Meses de acesso',
    accessMonthsPlaceholder: 'Ex: 12',
    accessMonthsHint:
      'Quantos meses o cliente tem acesso ao produto. Relevante quando não é vitalício.',
    stockCap: 'Limite de vagas (estoque do plano)',
    stockCapPlaceholder: 'Vazio = ilimitado',
    stockCapHint: 'Após esgotar, o checkout bloqueia novas compras neste preço.',
    checkoutStockLabel: 'Nome do limite no checkout',
    checkoutStockLabelPlaceholder: 'Ex.: Vagas, Inscrições, Licenças',
    checkoutStockLabelHint:
      'Texto ao lado do contador na página de pagamento. Vazio = "Qtdes disponíveis".',
    stockSoldReadonly: 'Vendas confirmadas (pagas)',
    promoTiers: 'Faixas de desconto',
    promoTiersListHint:
      'Cada faixa é uma regra: desconto, prazo e limite. A primeira faixa válida (pela ordem) é a que vale no checkout.',
    promoTierBlockSort: 'Ordem e desconto',
    promoTierBlockSortHint:
      'Ordem menor é avaliada primeiro. O desconto incide sobre o preço base do plano.',
    promoTierBlockDeadline: 'Prazo da faixa',
    promoTierBlockDeadlineHint:
      'Opcional. Depois desta data/hora a faixa deixa de valer e o sistema tenta a próxima ordem.',
    promoTierBlockPayment: 'Onde esta faixa vale',
    promoTierBlockCap: 'Limite desta promoção',
    promoSort: 'Ordem',
    promoPercent: 'Desconto %',
    promoEnds: 'Até (data e hora)',
    promoMaxUnits: 'Máx. vendas nesta faixa',
    promoMaxUnitsHint:
      'Vazio = ilimitado só para esta faixa (diferente do estoque total do plano).',
    promoUnitsSold: 'Já vendidas (esta faixa)',
    addPromoTier: 'Adicionar faixa',
    removePromoTier: 'Remover faixa',
    promoPreview: 'Lista efetiva no checkout (após primeira faixa ativa)',
    promoAppliesTo: 'Válido para',
    promoAppliesToHint: 'À vista = PIX ou cartão em 1x. Parcelado = só cartão parcelado.',
    promoAppliesAvista: 'À vista',
    promoAppliesParcelado: 'Parcelado',
    /** Texto curto no select para não truncar no campo. */
    promoAppliesBoth: 'À vista + parcelado',
  },
  topics: {
    title: 'Características do produto (tópicos)',
    description:
      'Seções com título e itens exibidos na página de pagamento para clareza do que está incluso.',
    addSection: 'Adicionar seção',
    sectionTitle: 'Título da seção',
    sectionTitlePlaceholder: 'Ex: O que está incluso',
    sectionContent: 'Itens (um por linha)',
    sectionContentPlaceholder: 'Item 1\nItem 2\nItem 3',
    removeSection: 'Remover seção',
    empty: 'Nenhuma seção. Clique em',
    emptyAction: 'para adicionar características exibidas no checkout.',
  },
  emailAddon: {
    title: 'Extras nos emails (só este preço)',
    description:
      'Somado ao que está na aba Emails do produto. Use para link ou mensagem específica deste plano/preço.',
    orderCreatedMessage: 'Mensagem extra — pedido criado',
    orderCreatedMessageHint:
      'Aparece depois da mensagem do produto no email de PIX/boleto/link de pagamento.',
    orderCreatedMessagePlaceholder: 'Ex: No plano anual você também tem acesso ao grupo VIP…',
    orderCreatedInstructions: 'Instruções extra — pedido criado',
    orderCreatedInstructionsPlaceholder: 'Opcional. Ex.: prazo do boleto',
    paymentMessage: 'Mensagem extra — pagamento confirmado',
    paymentMessageHint: 'Aparece depois da mensagem do produto quando o pagamento confirma.',
    paymentMessagePlaceholder: 'Ex: Acesse o material exclusivo do plano: https://…',
    paymentNextSteps: 'Próximos passos extras — pagamento confirmado',
    paymentNextStepsHint: 'Itens adicionais na lista de próximos passos (somados aos do produto).',
    nextStepPlaceholder: 'Ex: Entre no grupo do Telegram',
    addStep: 'Adicionar passo',
  },
  intervals: {
    day: 'Dia(s)',
    week: 'Semana(s)',
    month: 'Mês(es)',
    year: 'Ano(s)',
  },
  actions: {
    moveUp: 'Mover para cima',
    moveDown: 'Mover para baixo',
    remove: 'Remover preço',
  },
} as const
