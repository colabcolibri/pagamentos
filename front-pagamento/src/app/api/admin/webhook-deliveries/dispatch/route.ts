import { NextResponse } from 'next/server'

import { z } from 'zod'

import { recordAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'
import { validateRequest } from '@/lib/validators/helpers'
import { deliverProductWebhookForOrder } from '@/lib/webhooks/deliver-product-webhook'

const dispatchSchema = z.object({
  orderId: z.string().uuid('orderId deve ser um UUID válido'),
})

export const POST = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const body = await request.json()
    const validation = validateRequest(dispatchSchema, body)
    if (!validation.success) return validation.response

    const { orderId } = validation.data
    const result = await deliverProductWebhookForOrder(orderId)

    if (!result.dispatched) {
      return NextResponse.json(
        { error: result.reason ?? 'Não foi possível disparar o webhook', ...result },
        { status: 400 }
      )
    }

    await recordAdminAction(getPool(), {
      actorId: auth.user.id,
      action: 'webhook.manual_dispatch',
      targetType: 'order',
      targetId: orderId,
    })

    return NextResponse.json(result)
  },
  { module: 'admin', action: 'webhook_deliveries_dispatch' }
)
