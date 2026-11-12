import { InternalServerError, NotFoundError, ValidationError } from '../../errors'
import { getLogger } from '../../logger'
import { asaasCustomerFullNameMessage } from '../validators/customer-full-name.validators'

/**
 * Converte resposta de erro do POST /v3/checkouts em erro de domínio legível.
 */
function throwFromAsaasCheckoutCreateResponse(errorBody: unknown): never {
  if (
    errorBody &&
    typeof errorBody === 'object' &&
    Array.isArray((errorBody as { errors?: unknown }).errors)
  ) {
    const list = (errorBody as { errors: Array<{ code?: string; description?: string }> }).errors
    for (const item of list) {
      if (
        item?.code === 'invalid_object' &&
        typeof item.description === 'string' &&
        /\bname\b/i.test(item.description) &&
        /inválido/i.test(item.description)
      ) {
        throw new ValidationError(
          `${asaasCustomerFullNameMessage} Verifique os dados e tente de novo.`,
          'name'
        )
      }
    }
  }
  throw new InternalServerError(`Erro ao criar checkout: ${JSON.stringify(errorBody)}`)
}

/**
 * Cliente do Asaas
 */
export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
}

/**
 * Pagamento do Asaas
 */
export interface AsaasPaymentResponse {
  id: string
  invoiceUrl: string
  bankSlipUrl: string
  status: string
  value: number
  netValue: number
  dueDate: string
}

/**
 * Parcela do Asaas
 */
export interface AsaasInstallment {
  id: string
  value: number
  netValue: number
  description: string
  billingType: string
  confirmedDate: string | null
  paymentDate: string | null
  dueDate: string
  installmentNumber: number
  transactionReceiptUrl: string
  deleted: boolean
  anticipated: boolean
  anticipable: boolean
}

/**
 * Dados para criar cliente no Asaas
 */
export interface AsaasCreateCustomerData {
  name: string
  email: string
  cpfCnpj: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  mobilePhone?: string
  phone?: string
  company?: string
  municipalInscription?: string
  stateInscription?: string
}

/**
 * Dados para criar pagamento no Asaas
 */
export interface AsaasCreatePaymentData {
  customer: string
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'
  value?: number // Para pagamento único
  totalValue?: number // Para pagamento parcelado
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number // Para boleto parcelado
  interest?: {
    value: number
    type: 'PERCENTAGE'
  }
  fine?: {
    value: number
    type: 'PERCENTAGE' | 'FIXED'
  }
  discount?: {
    value: number          // Valor do desconto
    dueDateLimitDays: number // 0 = válido até o vencimento
    type: 'PERCENTAGE' | 'FIXED'
  }
}

/**
 * Dados para criar sessão de Checkout (API /v3/checkouts)
 * Usado para cartão parcelado com controle de maxInstallmentCount
 */
export interface AsaasCreateCheckoutData {
  billingTypes: ('CREDIT_CARD' | 'PIX')[]
  chargeTypes: ('DETACHED' | 'RECURRENT' | 'INSTALLMENT')[]
  items: Array<{
    name: string
    value: number
    quantity: number
    imageBase64: string
    description: string
    externalReference?: string
  }>
  callback: {
    successUrl: string
    cancelUrl: string
    expiredUrl?: string
  }
  externalReference?: string
  minutesToExpire?: number
  customerData?: {
    name?: string
    cpfCnpj?: string
    email?: string
    phone?: string
    phoneNumber?: string
    address?: string
    addressNumber?: string
    complement?: string
    province?: string
    postalCode?: string
  }
  installment?: {
    maxInstallmentCount: number
  }
}

export interface AsaasCheckoutResponse {
  id: string
  billingTypes: string[]
  chargeTypes: string[]
  minutesToExpire: number
  externalReference?: string
  callback?: { successUrl: string; cancelUrl: string; expiredUrl?: string }
  items?: unknown[]
  customerData?: unknown
  installment?: { maxInstallmentCount: number }
}

/**
 * Dados para criar parcelas no Asaas
 */
export interface AsaasCreateInstallmentsData {
  customer: string
  billingType: 'BOLETO'
  value: number
  dueDate: string
  installmentCount: number
  installmentValue: number
  description: string
}

/**
 * Service para integração com Asaas
 * Gerencia comunicação com a API do Asaas
 */
export class AsaasService {
  private logger = getLogger()
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, environment: 'production' | 'sandbox' = 'production') {
    const envApiKey =
      typeof process !== 'undefined' && process.env ? process.env.ASAAS_API_KEY : undefined

    const rawApiKey = apiKey || envApiKey || ''

    if (!rawApiKey) {
      throw new ValidationError('ASAAS_API_KEY não encontrada nas variáveis de ambiente')
    }

    // Adicionar $ automaticamente se não estiver presente
    this.apiKey = rawApiKey.startsWith('$') ? rawApiKey : `$${rawApiKey}`

    this.baseUrl =
      environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'

    this.logger.debug('Asaas Service inicializado', {
      environment,
      baseUrl: this.baseUrl,
    })
  }

  private getHeaders() {
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: this.apiKey,
    }
  }

  /**
   * Cria um cliente no Asaas
   */
  async createCustomer(data: AsaasCreateCustomerData): Promise<AsaasCustomer> {
    this.logger.info('Criando cliente no Asaas', {
      email: data.email,
      cpfCnpj: data.cpfCnpj,
    })

    try {
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        this.logger.error('Erro ao criar cliente no Asaas', {
          status: response.status,
          error,
        })
        throw new InternalServerError(`Erro ao criar cliente: ${JSON.stringify(error)}`)
      }

      const customer = await response.json()
      this.logger.info('Cliente criado com sucesso', {
        customerId: customer.id,
        email: customer.email,
      })

      return customer
    } catch (error) {
      this.logger.error('Erro ao criar cliente no Asaas', error, {
        email: data.email,
      })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao criar cliente no Asaas', { originalError: error })
    }
  }

  /**
   * Atualiza um cliente existente no Asaas.
   * Usado para sincronizar dados (CPF, nome, etc) antes de criar pagamento,
   * garantindo preenchimento correto na página de checkout.
   */
  async updateCustomer(
    customerId: string,
    data: Partial<AsaasCreateCustomerData>
  ): Promise<AsaasCustomer> {
    if (!customerId) {
      throw new ValidationError('ID do cliente é obrigatório', 'customerId')
    }

    this.logger.info('Atualizando cliente no Asaas', { customerId })

    try {
      const response = await fetch(`${this.baseUrl}/customers/${customerId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        this.logger.error('Erro ao atualizar cliente no Asaas', {
          customerId,
          status: response.status,
          error,
        })
        throw new InternalServerError(`Erro ao atualizar cliente: ${JSON.stringify(error)}`)
      }

      const customer = await response.json()
      this.logger.info('Cliente atualizado com sucesso', { customerId })
      return customer
    } catch (error) {
      this.logger.error('Erro ao atualizar cliente no Asaas', error, { customerId })
      if (error instanceof InternalServerError) {
        throw error
      }
      throw new InternalServerError('Erro ao atualizar cliente no Asaas', { originalError: error })
    }
  }

  /**
   * Busca cliente por CPF/CNPJ
   */
  async getCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    if (!cpfCnpj) {
      throw new ValidationError('CPF/CNPJ é obrigatório', 'cpfCnpj')
    }

    this.logger.info('Buscando cliente no Asaas', { cpfCnpj })

    try {
      const response = await fetch(`${this.baseUrl}/customers?cpfCnpj=${cpfCnpj}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        this.logger.warn('Cliente não encontrado no Asaas', { cpfCnpj, status: response.status })
        return null
      }

      const result = await response.json()
      const customer = result.data?.[0] || null

      if (customer) {
        this.logger.info('Cliente encontrado', { customerId: customer.id })
      }

      return customer
    } catch (error) {
      this.logger.error('Erro ao buscar cliente no Asaas', error, { cpfCnpj })
      return null
    }
  }

  /**
   * Cria um pagamento no Asaas
   */
  async createPayment(data: AsaasCreatePaymentData): Promise<AsaasPaymentResponse> {
    this.logger.info('Criando pagamento no Asaas', {
      customer: data.customer,
      billingType: data.billingType,
      value: data.value || data.totalValue,
    })

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        this.logger.error('Erro ao criar pagamento no Asaas', {
          status: response.status,
          error,
        })
        throw new InternalServerError(`Erro ao criar pagamento: ${JSON.stringify(error)}`)
      }

      const result = await response.json()
      this.logger.info('Pagamento criado com sucesso', {
        paymentId: result.id,
        status: result.status,
      })

      return result
    } catch (error) {
      this.logger.error('Erro ao criar pagamento no Asaas', error, {
        customer: data.customer,
      })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao criar pagamento no Asaas', { originalError: error })
    }
  }

  /**
   * Cria sessão de Checkout (POST /v3/checkouts).
   * Usado para cartão parcelado — retorna ID para montar URL:
   * https://asaas.com/checkoutSession/show?id={id}
   */
  async createCheckout(data: AsaasCreateCheckoutData): Promise<AsaasCheckoutResponse> {
    this.logger.info('Criando checkout no Asaas', {
      chargeTypes: data.chargeTypes,
      billingTypes: data.billingTypes,
      itemsCount: data.items.length,
    })

    try {
      const body: Record<string, unknown> = {
        billingTypes: data.billingTypes,
        chargeTypes: data.chargeTypes,
        items: data.items,
        callback: data.callback,
        externalReference: data.externalReference,
        minutesToExpire: data.minutesToExpire ?? 60,
      }
      if (data.customerData) body.customerData = data.customerData
      if (data.installment) body.installment = data.installment

      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        this.logger.error('Erro ao criar checkout no Asaas', {
          status: response.status,
          error,
        })
        throwFromAsaasCheckoutCreateResponse(error)
      }

      const result = await response.json()
      this.logger.info('Checkout criado com sucesso', {
        checkoutId: result.id,
      })
      return result
    } catch (error) {
      this.logger.error('Erro ao criar checkout no Asaas', error)
      if (error instanceof InternalServerError) throw error
      if (error instanceof ValidationError) throw error
      throw new InternalServerError('Erro ao criar checkout no Asaas', { originalError: error })
    }
  }

  /**
   * Cancela uma sessão de checkout (POST /v3/checkouts/{id}/cancel).
   * Usado para Checkout API quando o pagamento ainda não foi realizado (asaas_payment_id = null).
   */
  async cancelCheckout(checkoutId: string): Promise<void> {
    if (!checkoutId) {
      throw new ValidationError('ID do checkout é obrigatório', 'checkoutId')
    }

    this.logger.info('Cancelando checkout no Asaas', { checkoutId })

    const response = await fetch(`${this.baseUrl}/checkouts/${checkoutId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      this.logger.error('Erro ao cancelar checkout no Asaas', {
        checkoutId,
        status: response.status,
        errorData,
      })
      throw new InternalServerError(
        `Erro ao cancelar checkout: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    this.logger.info('Checkout cancelado com sucesso', { checkoutId })
  }

  /**
   * Retorna a URL do checkout a partir do ID retornado pela API.
   */
  getCheckoutUrl(checkoutId: string): string {
    const isSandbox = this.baseUrl.includes('sandbox')
    const host = isSandbox ? 'https://sandbox.asaas.com' : 'https://asaas.com'
    return `${host}/checkoutSession/show?id=${checkoutId}`
  }

  /**
   * Cria parcelas (boleto parcelado) no Asaas
   */
  async createInstallments(data: AsaasCreateInstallmentsData): Promise<AsaasInstallment[]> {
    this.logger.info('Criando parcelas no Asaas', {
      customer: data.customer,
      installmentCount: data.installmentCount,
      value: data.value,
    })

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        this.logger.error('Erro ao criar parcelas no Asaas', {
          status: response.status,
          error,
        })
        throw new InternalServerError(`Erro ao criar parcelas: ${JSON.stringify(error)}`)
      }

      const result = await response.json()
      const installments = result.data || []
      this.logger.info('Parcelas criadas com sucesso', {
        count: installments.length,
      })

      return installments
    } catch (error) {
      this.logger.error('Erro ao criar parcelas no Asaas', error, {
        customer: data.customer,
      })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao criar parcelas no Asaas', { originalError: error })
    }
  }

  /**
   * Busca um pagamento por ID
   */
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    if (!paymentId) {
      throw new ValidationError('ID do pagamento é obrigatório', 'paymentId')
    }

    this.logger.info('Buscando pagamento no Asaas', { paymentId })

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError('Pagamento', paymentId)
        }
        this.logger.error('Erro ao buscar pagamento', {
          paymentId,
          status: response.status,
        })
        throw new InternalServerError(`Erro ao buscar pagamento: ${response.status}`)
      }

      const result = await response.json()
      this.logger.info('Pagamento encontrado', { paymentId })

      return result
    } catch (error) {
      this.logger.error('Erro ao buscar pagamento no Asaas', error, { paymentId })

      if (error instanceof NotFoundError || error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao buscar pagamento no Asaas', { originalError: error })
    }
  }

  /**
   * Busca QR Code PIX de um pagamento.
   * Retorna encodedImage (base64 da imagem) e payload (código copia-e-cola).
   */
  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string }> {
    if (!paymentId) {
      throw new ValidationError('ID do pagamento é obrigatório', 'paymentId')
    }

    this.logger.info('Buscando QR Code PIX', { paymentId })

    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/pixQrCode`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        this.logger.error('Erro ao buscar QR Code PIX', {
          paymentId,
          status: response.status,
        })
        throw new InternalServerError(`Erro ao buscar QR Code PIX: ${response.status}`)
      }

      const result = await response.json()
      this.logger.info('QR Code PIX obtido', { paymentId })

      return {
        encodedImage: result.encodedImage || '',
        payload: result.payload || '',
      }
    } catch (error) {
      this.logger.error('Erro ao buscar QR Code PIX', error, { paymentId })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao buscar QR Code PIX no Asaas', {
        originalError: error,
      })
    }
  }

  /**
   * Busca carnê completo de um parcelamento (todas as parcelas em PDF)
   */
  async getPaymentBook(installmentId: string): Promise<string> {
    if (!installmentId) {
      throw new ValidationError('ID do parcelamento é obrigatório', 'installmentId')
    }

    this.logger.info('Buscando carnê completo do parcelamento', { installmentId })

    try {
      const response = await fetch(`${this.baseUrl}/installments/${installmentId}/paymentBook`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        this.logger.error('Erro ao buscar carnê', {
          installmentId,
          status: response.status,
          errorData,
        })
        throw new InternalServerError(`Erro ao buscar carnê: ${JSON.stringify(errorData)}`)
      }

      // A API retorna um PDF diretamente
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      this.logger.info('Carnê obtido com sucesso', { installmentId })
      return url
    } catch (error) {
      this.logger.error('Erro ao buscar carnê no Asaas', error, { installmentId })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao buscar carnê no Asaas', { originalError: error })
    }
  }

  /**
   * Remove uma cobrança no Asaas (DELETE /payments/:id).
   * Usado para pagamento único (não parcelado). Deve ser chamado antes de excluir o registro local.
   */
  async deletePayment(paymentId: string): Promise<void> {
    if (!paymentId) {
      throw new ValidationError('ID do pagamento é obrigatório', 'paymentId')
    }

    this.logger.info('Removendo cobrança no Asaas', { paymentId })

    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      this.logger.error('Erro ao remover cobrança no Asaas', {
        paymentId,
        status: response.status,
        errorData,
      })
      throw new InternalServerError(
        `Erro ao remover cobrança: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    this.logger.info('Cobrança removida com sucesso', { paymentId })
  }

  /**
   * Cancela cobranças pendentes/vencidas de um parcelamento (DELETE /installments/:id/payments).
   * Usado para boleto parcelado. Deve ser chamado antes de excluir o registro local.
   */
  async cancelInstallmentPayments(installmentId: string): Promise<void> {
    if (!installmentId) {
      throw new ValidationError('ID do parcelamento é obrigatório', 'installmentId')
    }

    this.logger.info('Cancelando cobranças do parcelamento no Asaas', { installmentId })

    const response = await fetch(
      `${this.baseUrl}/installments/${installmentId}/payments`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      this.logger.error('Erro ao cancelar parcelamento no Asaas', {
        installmentId,
        status: response.status,
        errorData,
      })
      throw new InternalServerError(
        `Erro ao cancelar parcelamento: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    this.logger.info('Cobranças do parcelamento canceladas', { installmentId })
  }
}

/**
 * Factory para criar instância do AsaasService
 */
export function createAsaasService(
  apiKey?: string,
  environment?: 'production' | 'sandbox'
): AsaasService {
  return new AsaasService(apiKey, environment)
}

