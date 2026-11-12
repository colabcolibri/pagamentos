import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { countAdminOrders, listAdminOrders } from '@/lib/payments/admin-orders'
import type { OrderStatus } from '@/lib/payments/order'
import { orderValidators } from '@/lib/payments/order'
import { validateQuery } from '@/lib/validators/helpers'

/**
 * GET /api/admin/orders
 * Lista pedidos com filtros
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
    const validation = validateQuery(orderValidators.get, searchParams)
    if (!validation.success) {
      return validation.response
    }

    const {
      userId,
      status,
      orderType,
      paymentGateway,
      paymentMethod,
      includeRelations,
      orderBy,
      orderDirection,
      limit,
      offset,
    } = validation.data

    // Buscar pedidos usando service
    const filter = {
      userId,
      status: status as OrderStatus[] | undefined,
      orderType,
      paymentGateway,
      paymentMethod,
      orderBy,
      orderDirection,
      limit,
      offset,
    }
    void includeRelations
    const orders = await listAdminOrders(filter)
    const total = await countAdminOrders(filter)

    return NextResponse.json({
      orders,
      total,
      limit: limit || undefined,
      offset: offset || undefined,
    })
  },
  { module: 'admin', action: 'list_orders' }
)
