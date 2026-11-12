import { NextResponse } from 'next/server'

import { z } from 'zod'

import { createApiHandler } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { findPublicProductsByRefs } from '@/lib/payments/catalog/postgres-catalog'
import { type Product, toPublicProduct } from '@/lib/payments/product/product.types'
import { validateQuery } from '@/lib/validators/helpers'

/** Limite de refs por requisição (evita URL gigante e carga no banco). */
const MAX_REFS_PER_BATCH = 50

const batchProductsSchema = z.object({
  refs: z
    .string()
    .transform((val) => val.split(',').filter(Boolean))
    .pipe(
      z
        .array(z.string().min(1))
        .min(1)
        .max(MAX_REFS_PER_BATCH, `No máximo ${MAX_REFS_PER_BATCH} produtos por requisição`)
    ),
})

function dedupeRefsPreserveOrder(refs: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of refs) {
    if (seen.has(r)) continue
    seen.add(r)
    out.push(r)
  }
  return out
}

/**
 * GET /api/products/batch?refs=ref1,ref2,ref3
 * Busca múltiplos produtos públicos por refs (rota pública)
 * - Não requer autenticação
 * - Retorna apenas produtos ativos
 */
export const GET = createApiHandler(
  async (request: Request) => {
    const { searchParams } = new URL(request.url)
    const refsParam = searchParams.get('refs')

    if (!refsParam) {
      return apiErrorResponse({
        error: 'Parâmetro refs é obrigatório',
        code: 'INVALID_REQUEST',
        status: 400,
      })
    }

    const validation = validateQuery(batchProductsSchema, { refs: refsParam })
    if (!validation.success) {
      return validation.response
    }

    const uniqueRefs = dedupeRefsPreserveOrder(validation.data.refs)

    try {
      const found = await findPublicProductsByRefs(uniqueRefs)
      const byRef = new Map(found.map((p) => [p.ref, p]))
      const ordered: Product[] = []
      for (const ref of uniqueRefs) {
        const p = byRef.get(ref)
        if (p) ordered.push(p)
      }

      const products = ordered.map(toPublicProduct)

      return NextResponse.json({ products })
    } catch (error) {
      throw error
    }
  },
  { module: 'products', action: 'get_products_batch' }
)
