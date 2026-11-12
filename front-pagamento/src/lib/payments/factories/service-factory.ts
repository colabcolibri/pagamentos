import { OrderService, SupabaseOrderRepository } from '../order'
import { PostgresProductRepository } from '../product/postgres-product.repository'
import { ProductService } from '../product/product.service'
import { SupabaseProductRepository } from '../product/supabase-product.repository'
import type { AppSupabaseClient } from '../types/supabase-client'

export type CreateServicesOptions = {
  /** Somente com cliente service_role. Anon/authenticated não têm SELECT em webhook_* no Postgres. */
  includeWebhookColumnsInProductSelect?: boolean
}

/**
 * Factory para criar services com suas dependências (repositories)
 */
export function createServices(supabase: AppSupabaseClient, options?: CreateServicesOptions) {
  const productRepository = new SupabaseProductRepository(
    supabase,
    options?.includeWebhookColumnsInProductSelect ?? false
  )
  const orderRepository = new SupabaseOrderRepository(supabase)

  return {
    productService: new ProductService(productRepository),
    orderService: new OrderService(orderRepository),
  }
}

/**
 * ProductService com SELECT em webhook_url/webhook_secret (service_role).
 * Usar somente após `requireAdmin()`.
 */
export function createAdminProductServices() {
  return {
    productService: new ProductService(new PostgresProductRepository()),
  }
}
