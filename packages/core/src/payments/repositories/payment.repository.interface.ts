import type {
    AsaasPayment,
    CreatePaymentDTO,
    PagarmePayment,
    PaymentQueryOptions,
    UpdatePaymentDTO,
} from '../types'

/**
 * Interface do repositório de pagamentos
 * Suporta tanto PagarmePayment quanto AsaasPayment
 */
export interface PaymentRepository {
  /**
   * Busca um pagamento Pagar.me por ID
   */
  findPagarmeById(id: string): Promise<PagarmePayment | null>

  /**
   * Busca um pagamento Asaas por ID
   */
  findAsaasById(id: string): Promise<AsaasPayment | null>

  /**
   * Busca pagamentos Pagar.me com filtros
   */
  findManyPagarme(options?: PaymentQueryOptions): Promise<PagarmePayment[]>

  /**
   * Busca pagamentos Asaas com filtros
   */
  findManyAsaas(options?: PaymentQueryOptions): Promise<AsaasPayment[]>

  /**
   * Cria um novo pagamento Pagar.me
   */
  createPagarme(data: CreatePaymentDTO): Promise<PagarmePayment>

  /**
   * Cria um novo pagamento Asaas
   */
  createAsaas(data: CreatePaymentDTO): Promise<AsaasPayment>

  /**
   * Atualiza um pagamento Pagar.me
   */
  updatePagarme(id: string, data: UpdatePaymentDTO): Promise<PagarmePayment>

  /**
   * Atualiza um pagamento Asaas
   */
  updateAsaas(id: string, data: UpdatePaymentDTO): Promise<AsaasPayment>

  /**
   * Verifica se um pagamento Pagar.me existe
   */
  existsPagarme(id: string): Promise<boolean>

  /**
   * Verifica se um pagamento Asaas existe
   */
  existsAsaas(id: string): Promise<boolean>
}

