import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'

const subscriptionsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  status: z
    .enum(['incomplete', 'active', 'past_due', 'canceled', 'unpaid'])
    .optional()
    .or(z.string().transform((val) => val.split(','))),
  includeRelations: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
})

/**
 * GET /api/admin/subscriptions
 * Lista assinaturas com filtros
 */
export const GET = createApiHandler(
  async (request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    // Validar query params
    const { searchParams } = new URL(request.url)
    const validation = subscriptionsQuerySchema.safeParse({
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
      includeRelations: searchParams.get('includeRelations') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { userId, status, includeRelations, limit, offset } = validation.data

    const values: unknown[] = []
    const parts = ['TRUE']
    if (userId) {
      values.push(userId)
      parts.push(`s.user_id = $${values.length}`)
    }
    if (status) {
      values.push(Array.isArray(status) ? status : [status])
      parts.push(`s.status = ANY($${values.length}::text[])`)
    }
    const where = parts.join(' AND ')
    const pageLimit = limit ?? 20
    const pageOffset = offset ?? 0
    const relationSelect = includeRelations
      ? `, json_build_object('id', pf.id, 'email', pf.email, 'name', pf.name) AS profiles,
         json_build_object(
           'id', pr.id, 'amount', pr.amount, 'currency', pr.currency, 'recurring', pr.recurring,
           'interval', pr.interval, 'interval_count', pr.interval_count,
           'products', json_build_object('id', p.id, 'name', p.name, 'ref', p.ref)
         ) AS prices`
      : ''
    const listed = await getPool().query(
      `SELECT s.* ${relationSelect}
       FROM payments.subscriptions s
       LEFT JOIN payments.profiles pf ON pf.id = s.user_id
       LEFT JOIN payments.prices pr ON pr.id = s.price_id
       LEFT JOIN payments.products p ON p.id = pr.product_id
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT ${pageLimit} OFFSET ${pageOffset}`,
      values
    )
    const counted = await getPool().query<{ total: number }>(
      `SELECT count(*)::int AS total FROM payments.subscriptions s WHERE ${where}`,
      values
    )

    return NextResponse.json({
      subscriptions: listed.rows,
      total: counted.rows[0]?.total ?? 0,
      limit: limit || undefined,
      offset: offset || undefined,
    })
  },
  { module: 'admin', action: 'list_subscriptions' }
)
