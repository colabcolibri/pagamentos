import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandlerWithParams } from '@/lib/errors'
import { readAdminOrder, softDeleteCancelledOrder } from '@/lib/payments/admin-orders'
import { orderValidators } from '@/lib/payments/order'
import { validateQuery, validateUuidParam } from '@/lib/validators/helpers'

/**
 * GET /api/admin/orders/[id]
 * Busca um pedido por ID
 */
export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    // Validar query params
    const { searchParams } = new URL(request.url)
    const validation = validateQuery(orderValidators.getById, searchParams)
    if (!validation.success) {
      return validation.response
    }

    const { includeRelations } = validation.data

    // Buscar pedido usando service
    void includeRelations
    const order = await readAdminOrder(id)
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ order })
  },
  { module: 'admin', action: 'get_order' }
)

/**
 * DELETE /api/admin/orders/[id]
 * Deleta um pedido (soft delete)
 */
export const DELETE = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { user } = authResult
    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const order = await readAdminOrder(id)
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (order.status !== 'cancelled') {
      return NextResponse.json(
        {
          error: 'Só é permitido deletar pedidos cancelados. Cancele o pedido antes.',
        },
        { status: 403 }
      )
    }
    await softDeleteCancelledOrder(id, user.id)

    return NextResponse.json({ success: true, message: 'Pedido deletado com sucesso' })
  },
  { module: 'admin', action: 'delete_order' }
)
