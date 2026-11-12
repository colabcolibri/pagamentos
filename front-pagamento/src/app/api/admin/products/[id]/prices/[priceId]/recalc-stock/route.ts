import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors/error-handler'
import { validateUuidParam } from '@/lib/validators/helpers'

/**
 * POST /api/admin/products/[id]/prices/[priceId]/recalc-stock
 * Recalcula stock_sold e units_sold do preço a partir das orders pagas.
 */
export const POST = createApiHandlerWithParams(
  async (_request: Request, { params }: { params: Promise<{ id: string; priceId: string }> }) => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const { priceId } = await params

    const invalidPriceId = validateUuidParam(priceId)
    if (invalidPriceId) return invalidPriceId

    try {
      await getPool().query('SELECT payments.recalc_stock_for_price($1)', [priceId])
      const price = await getPool().query<{ stock_sold: number }>(
        'SELECT stock_sold FROM payments.prices WHERE id = $1',
        [priceId]
      )
      if (!price.rows[0]) {
        return NextResponse.json({ error: 'Preço não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ stock_sold: price.rows[0].stock_sold })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao recalcular estoque'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  },
  { module: 'admin', action: 'recalc_stock' }
)
