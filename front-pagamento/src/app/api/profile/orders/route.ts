import { NextResponse } from 'next/server'

import { getApiContext } from '@/lib/auth/api-context'
import { createApiHandler } from '@/lib/errors'
import { listOwnOrders } from '@/lib/profile/profile-store'

/**
 * GET /api/profile/orders
 * Lista só os pedidos do perfil da sessão.
 */
export const GET = createApiHandler(
  async (_request: Request) => {
    const context = await getApiContext()
    if (context instanceof NextResponse) {
      return context
    }

    const orders = await listOwnOrders(context.user.id)

    return NextResponse.json({
      orders,
    })
  },
  { module: 'profile', action: 'get_orders' }
)
