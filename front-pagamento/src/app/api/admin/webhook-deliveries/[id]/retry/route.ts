import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { retryWebhookDeliveryById } from '@/lib/checkout-sessions/webhook-deliveries'
import { createApiHandlerWithParams } from '@/lib/errors'
import { validateUuidParam } from '@/lib/validators/helpers'

export const POST = createApiHandlerWithParams(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const result = await retryWebhookDeliveryById(id)
    if (!result.found) {
      return NextResponse.json({ error: 'Entrega não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result)
  },
  { module: 'admin', action: 'webhook_deliveries_retry' }
)
