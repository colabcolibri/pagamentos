import { NextResponse } from 'next/server'

import { createApiHandlerWithParams } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { findPublicProductByRef } from '@/lib/payments/catalog/postgres-catalog'
import { toPublicProduct } from '@/lib/payments/product/product.types'

/**
 * GET /api/products/[ref]
 * Busca produto público por ref (rota pública)
 * - Não requer autenticação
 * - Retorna apenas produtos ativos
 */
export const GET = createApiHandlerWithParams(
  async (_request: Request, { params }: { params: Promise<{ ref: string }> }) => {
    const { ref } = await params

    if (!ref) {
      return apiErrorResponse({
        error: 'Ref é obrigatório',
        code: 'INVALID_REQUEST',
        status: 400,
      })
    }

    try {
      const product = await findPublicProductByRef(ref)
      if (!product) {
        return apiErrorResponse({
          error: 'Produto não encontrado',
          code: 'NOT_FOUND',
          status: 404,
        })
      }

      // Garantir que apenas produtos ativos sejam retornados
      if (!product.active) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      }

      return NextResponse.json({ product: toPublicProduct(product) })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'NOT_FOUND' || err.message?.includes('não encontrado')) {
        return apiErrorResponse({
          error: 'Produto não encontrado',
          code: 'NOT_FOUND',
          status: 404,
        })
      }
      throw error
    }
  },
  { module: 'products', action: 'get_product_by_ref' }
)
