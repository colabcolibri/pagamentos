/**
 * Textos e tipo do CheckoutForm (extraído na refatoração 9.1).
 */
export type AsaasCheckoutFlow = 'avista' | 'parcelado'

export interface CheckoutFormData {
  email: string
  name: string
  phone?: string
  selectedGateway: 'pagarme' | 'asaas'
  checkoutFlow?: AsaasCheckoutFlow
  billingType?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'
  installments?: number
  /** Código promocional (opcional) */
  couponCode?: string
  personType?: 'fisica' | 'juridica'
  cpf?: string
  cnpj?: string
  razaoSocial?: string
  ie?: string
  im?: string
  cep?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  acceptedRefundPolicy: boolean
}

export const CHECKOUT_FORM_CONTENT = {
  steps: {
    auth: {
      title: 'Autenticação',
      description: 'Digite seu e-mail para continuar',
    },
    data: {
      title: 'Login',
    },
    payment: {
      title: 'Forma de pagamento',
      description: 'Escolha como deseja pagar',
    },
  },

  fields: {
    email: 'E-mail',
    emailLocked: 'E-mail (autenticado)',
    name: 'Nome completo',
    namePlaceholder: 'Seu nome completo',
  },

  asaasFields: {
    title: 'Dados para faturamento',
    subtitle: 'Necessários para emissão da cobrança',
    /** Legenda única: campos sem * podem ficar em branco quando aplicável. */
    requiredLegend: '* Campos obrigatórios.',
    cepHint: 'Com o CEP completo, buscamos rua, bairro, cidade e UF automaticamente.',
    personType: {
      label: 'Tipo de pessoa',
      fisica: 'Pessoa física',
      juridica: 'Pessoa jurídica',
    },
    cpf: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    cnpj: 'CNPJ',
    cnpjPlaceholder: '00.000.000/0000-00',
    phone: 'Telefone',
    phonePlaceholder: '(11) 99999-9999',
    razaoSocial: 'Razão social',
    razaoSocialPlaceholder: 'Nome da empresa',
    ie: 'Inscrição estadual',
    im: 'Inscrição municipal',
    cep: 'CEP',
    cepPlaceholder: '00000-000',
    address: 'Endereço',
    addressNumber: 'Número',
    complement: 'Complemento',
    province: 'Bairro',
    city: 'Cidade',
    state: 'Estado',
    statePlaceholder: 'Ex: SP',
  },

  coupon: {
    label: 'Cupom de desconto',
    placeholder: 'Ex: PROMO10',
    apply: 'Aplicar',
    applying: 'Verificando...',
    flowAvista: 'à vista',
    flowParcelado: 'parcelado',
    appliesTo: 'Válido para',
    subtotal: 'Subtotal',
    discount: 'Desconto',
    total: 'Total com cupom',
    /** Resumo abaixo do cupom aplicado (painel fechado) */
    totalToPay: 'Total a pagar',
    /** Onde o cupom vale (texto curto no resumo). */
    validForPayment: 'Válido para pagamento',
    paymentAvista: 'à vista (PIX ou cartão em 1x)',
    paymentParcelado: 'à prazo (cartão parcelado)',
    paymentBoth: 'à vista e à prazo',
    discountPercentLabel: '{percent}% de desconto',
    discountFixedLabel: 'Desconto fixo de {amount}',
    invalid: 'Cupom inválido ou não aplicável.',
    toggleQuestion: 'Tem um código de desconto?',
    toggleAction: 'Clique aqui.',
    closePanel: 'Fechar',
    appliedCompact: 'Cupom aplicado:',
    /** Título visual quando o cupom está aplicado (painel fechado). */
    appliedHeading: 'Cupom ativo',
    editCoupon: 'Alterar',
    removeCoupon: 'Remover',
  },

  logout: {
    hint: 'Você está autenticado.',
    button: 'Sair',
  },

  /** Bloco que envolve o resumo de preço/promo (coluna do formulário). */
  paymentValuesSection: {
    title: 'Pagamento',
    hint: '',
  },

  policy: {
    title: 'Política de compra',
    titleAccepted: 'Política aceita',
    description: 'Leia e aceite a política de compra para continuar',
    descriptionAccepted: 'Você aceitou os termos da política de compra',
    buttonAccepted: 'Ver política aceita',
  },

  submit: {
    button: 'Finalizar compra',
    processing: 'Processando...',
  },

  validation: {
    nameRequired: 'Nome é obrigatório',
    nameMin: 'Nome deve ter pelo menos 3 caracteres',
    fullNameTwoWords: 'Informe nome e sobrenome (pelo menos duas palavras separadas por espaço).',
    documentRequired: 'CPF é obrigatório',
    documentInvalid: 'CPF inválido',
    phoneRequired: 'Telefone é obrigatório',
    phoneInvalid: 'Telefone inválido',
    cpfInvalid: 'CPF inválido',
    cpfInvalidDigits: 'CPF inválido (dígitos verificadores incorretos)',
    cpfRequired: 'CPF é obrigatório',
    cnpjInvalid: 'CNPJ inválido',
    cnpjInvalidDigits: 'CNPJ inválido (dígitos verificadores incorretos)',
    cnpjRequired: 'CNPJ é obrigatório',
    cepInvalid: 'CEP inválido',
    cepNotFound: 'CEP não encontrado',
    cepError: 'Erro ao buscar CEP',
    addressRequired: 'Endereço é obrigatório',
    addressNumberRequired: 'Número é obrigatório',
    provinceRequired: 'Bairro é obrigatório',
    cityRequired: 'Cidade é obrigatória',
    stateRequired: 'UF é obrigatória (2 letras)',
    stateInvalidUf: 'Informe a UF com 2 letras (ex.: SP)',
    razaoSocialRequired: 'Razão Social é obrigatória',
    personTypeRequired: 'Selecione o tipo de pessoa',
    emailInvalid: 'E-mail inválido',
  },
} as const
