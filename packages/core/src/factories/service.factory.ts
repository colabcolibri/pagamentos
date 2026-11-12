import type { SupabaseClient } from '../types/query-client'

import { createAdminService } from '../admin/services'
import { SupabaseOrderRepository, SupabasePaymentRepository } from '../payments/repositories'
import { createAsaasService, createPagarmeService } from '../payments/services'
import type { Database } from '../types/supabase-types'

/**
 * Configuração para criar services
 */
export interface ServiceFactoryConfig {
  supabase: SupabaseClient<Database>
  supabaseWithAuth?: SupabaseClient<Database> // Para métodos que precisam de contexto de autenticação
  pagarmeApiKey?: string
  asaasApiKey?: string
  asaasEnvironment?: 'production' | 'sandbox'
}

/**
 * Factory para criar services com suas dependências
 * Centraliza a criação de services e injeção de dependências
 */
export class ServiceFactory {
  private supabase: SupabaseClient<Database>
  private supabaseWithAuth?: SupabaseClient<Database>
  private pagarmeApiKey?: string
  private asaasApiKey?: string
  private asaasEnvironment?: 'production' | 'sandbox'

  // Cache de repositories
  private _orderRepository?: SupabaseOrderRepository
  private _paymentRepository?: SupabasePaymentRepository

  constructor(config: ServiceFactoryConfig) {
    this.supabase = config.supabase
    this.supabaseWithAuth = config.supabaseWithAuth
    this.pagarmeApiKey = config.pagarmeApiKey
    this.asaasApiKey = config.asaasApiKey
    this.asaasEnvironment = config.asaasEnvironment || 'production'
  }

  /**
   * Cria ou retorna o OrderRepository (singleton)
   */
  getOrderRepository(): SupabaseOrderRepository {
    if (!this._orderRepository) {
      this._orderRepository = new SupabaseOrderRepository(this.supabase)
    }
    return this._orderRepository
  }

  /**
   * Cria ou retorna o PaymentRepository (singleton)
   */
  getPaymentRepository(): SupabasePaymentRepository {
    if (!this._paymentRepository) {
      this._paymentRepository = new SupabasePaymentRepository(this.supabase)
    }
    return this._paymentRepository
  }

  /**
   * Cria o AdminService
   */
  createAdminService() {
    return createAdminService(this.supabase, this.supabaseWithAuth)
  }

  /**
   * Cria o PagarmeService
   */
  createPagarmeService() {
    return createPagarmeService(this.pagarmeApiKey)
  }

  /**
   * Cria o AsaasService
   */
  createAsaasService() {
    return createAsaasService(this.asaasApiKey, this.asaasEnvironment)
  }
}

/**
 * Factory function para criar ServiceFactory
 */
export function createServiceFactory(config: ServiceFactoryConfig): ServiceFactory {
  return new ServiceFactory(config)
}

