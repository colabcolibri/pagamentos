import { InternalServerError, ValidationError } from '../../errors'
import { getLogger } from '../../logger'

/**
 * Interface para link de pagamento do Pagar.me
 */
export interface PagarmePaymentLink {
  id: string
  url: string
  status: string
  created_at: string
  updated_at: string
  expires_in?: number
  max_sessions?: number
  max_paid_sessions?: number
}

/**
 * Dados para criar checkout no Pagar.me
 */
export interface PagarmeCheckoutRequest {
  is_building?: boolean
  name: string
  type: 'order'
  expires_in?: number
  max_sessions?: number
  max_paid_sessions?: number
  payment_settings: {
    accepted_payment_methods: string[]
    credit_card_settings?: {
      operation_type: 'auth_and_capture'
      installments: Array<{
        number: number
        total: number
      }>
      installments_setup?: {
        interest_type: 'simple'
        interest_rate: number
        max_installments?: number
        min_installment_amount?: number
      }
    }
    boleto_settings?: {
      due_in: number
      instructions: string
      discount?: number
      discount_percentage?: number
    }
    pix_settings?: {
      expires_in: number
      discount?: number
      discount_percentage?: number
    }
  }
  cart_settings: {
    items: Array<{
      amount: number
      name: string
      default_quantity: number
    }>
  }
  customer_settings?: {
    customer?: {
      name: string
      email: string
      document?: string
      type: 'individual'
    }
  }
  order_code?: string
}

/**
 * Service para integração com Pagar.me
 * Gerencia comunicação com a API do Pagar.me
 */
export class PagarmeService {
  private logger = getLogger()
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, environment: 'production' | 'sandbox' = 'production') {
    // Verificar se estamos no ambiente Node.js antes de acessar process.env
    const envApiKey =
      typeof process !== 'undefined' && process.env ? process.env.PAGARME_SECRET_KEY : undefined

    this.apiKey = apiKey || envApiKey || ''
    this.baseUrl =
      environment === 'production'
        ? 'https://api.pagar.me/core/v5'
        : 'https://sdx-api.pagar.me/core/v5'

    if (!this.apiKey) {
      throw new ValidationError('PAGARME_SECRET_KEY não encontrada nas variáveis de ambiente')
    }

    this.logger.debug('Pagar.me Service inicializado', {
      environment,
      baseUrl: this.baseUrl,
    })
  }

  private getHeaders() {
    const authHeader = `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: authHeader,
    }
  }

  /**
   * Cria um link de pagamento no Pagar.me
   */
  async createPaymentLink(data: PagarmeCheckoutRequest): Promise<PagarmePaymentLink> {
    this.logger.info('Criando payment link no Pagar.me', {
      productName: data.name,
      expiresIn: data.expires_in,
    })

    try {
      const response = await fetch(`${this.baseUrl}/paymentlinks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        let errorData
        const contentType = response.headers.get('content-type')

        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
          } else {
            errorData = await response.text()
          }
        } catch (readError) {
          this.logger.error('Erro ao ler resposta do Pagar.me', readError)
          errorData = `Erro ${response.status} - Não foi possível ler a resposta`
        }

        this.logger.error('Erro ao criar payment link no Pagar.me', {
          status: response.status,
          errorData,
        })

        throw new InternalServerError(
          `Erro do Pagar.me: ${response.status} - ${JSON.stringify(errorData)}`
        )
      }

      const result = await response.json()
      this.logger.info('Payment link criado com sucesso', {
        paymentLinkId: result.id,
        url: result.url,
      })

      return result
    } catch (error) {
      this.logger.error('Erro na requisição para Pagar.me', error, {
        productName: data.name,
      })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao criar payment link no Pagar.me', { originalError: error })
    }
  }

  /**
   * Busca um link de pagamento por ID
   */
  async getPaymentLink(paymentLinkId: string): Promise<PagarmePaymentLink> {
    if (!paymentLinkId) {
      throw new ValidationError('ID do payment link é obrigatório', 'paymentLinkId')
    }

    this.logger.info('Buscando payment link no Pagar.me', { paymentLinkId })

    try {
      const response = await fetch(`${this.baseUrl}/paymentlinks/${paymentLinkId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        this.logger.error('Erro ao buscar payment link', {
          paymentLinkId,
          status: response.status,
        })
        throw new InternalServerError(`Erro ao buscar link de pagamento: ${response.status}`)
      }

      const result = await response.json()
      this.logger.info('Payment link encontrado', { paymentLinkId })

      return result
    } catch (error) {
      this.logger.error('Erro ao buscar payment link', error, { paymentLinkId })

      if (error instanceof InternalServerError) {
        throw error
      }

      throw new InternalServerError('Erro ao buscar payment link no Pagar.me', {
        originalError: error,
      })
    }
  }

  /**
   * Cancela um link de pagamento no Pagar.me (PATCH .../paymentlinks/:id/cancel).
   * Deve ser chamado antes de excluir o registro local.
   */
  async cancelPaymentLink(paymentLinkId: string): Promise<void> {
    if (!paymentLinkId) {
      throw new ValidationError('ID do payment link é obrigatório', 'paymentLinkId')
    }

    this.logger.info('Cancelando payment link no Pagar.me', { paymentLinkId })

    const response = await fetch(
      `${this.baseUrl}/paymentlinks/${paymentLinkId}/cancel`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      const rawText = await response.text()
      let errorPayload: unknown = rawText
      try {
        errorPayload = rawText ? JSON.parse(rawText) : {}
      } catch {
        // mantém rawText se não for JSON
      }
      const payloadStr =
        typeof errorPayload === 'object' && errorPayload !== null
          ? JSON.stringify(errorPayload)
          : String(errorPayload)
      const isAlreadyInactive =
        response.status === 400 &&
        (payloadStr.includes("'expired' status to 'cancelled'") ||
          payloadStr.includes('expired') && payloadStr.toLowerCase().includes('cancelled'))
      if (isAlreadyInactive) {
        this.logger.info('Link já inativo no Pagar.me (ex.: expirado); nada a cancelar', {
          paymentLinkId,
        })
        return
      }
      this.logger.error('Erro ao cancelar payment link', {
        paymentLinkId,
        status: response.status,
        statusText: response.statusText,
        errorPayload,
      })
      throw new InternalServerError(
        `Erro ao cancelar link de pagamento: ${response.status} ${response.statusText} - ${payloadStr}`
      )
    }

    this.logger.info('Payment link cancelado com sucesso', { paymentLinkId })
  }

  /**
   * Gera array de parcelas para cartão de crédito
   */
  generateInstallments(amount: number, maxInstallments: number = 12): Array<{ number: number; total: number }> {
    const installments = []
    for (let i = 1; i <= maxInstallments; i++) {
      installments.push({
        number: i,
        total: amount,
      })
    }
    return installments
  }

  /**
   * Cria nome seguro para o produto (respeitando limite de caracteres)
   */
  static createSafeName(
    productName: string,
    options: {
      isRenewal?: boolean
      subscriptionId?: string
      maxLength?: number
    } = {}
  ): string {
    const { isRenewal = false, subscriptionId, maxLength = 64 } = options

    const cleanProductName = productName.trim()
    const suffixes = []
    if (isRenewal) suffixes.push('RENOVADO')
    if (subscriptionId) suffixes.push(`#${subscriptionId.slice(-8)}`)

    const suffix = suffixes.length > 0 ? ` (${suffixes.join(' - ')})` : ''
    const availableLength = maxLength - suffix.length

    if (cleanProductName.length <= availableLength) {
      return cleanProductName + suffix
    }

    const truncatedProduct = cleanProductName.substring(0, availableLength - 3) + '...'
    return truncatedProduct + suffix
  }
}

/**
 * Factory para criar instância do PagarmeService
 */
export function createPagarmeService(
  apiKey?: string,
  environment?: 'production' | 'sandbox'
): PagarmeService {
  return new PagarmeService(apiKey, environment)
}

