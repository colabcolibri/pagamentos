import { PostgresProductRepository } from '../product/postgres-product.repository'
import { ProductService } from '../product/product.service'

/**
 * ProductService direto no Postgres.
 * Usar somente após `requireAdmin()`.
 */
export function createAdminProductServices() {
  return {
    productService: new ProductService(new PostgresProductRepository()),
  }
}
