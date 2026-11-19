import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import type { WebhookDeliveryStatus } from '@/lib/checkout-sessions/types'
import { listWebhookDeliveries } from '@/lib/checkout-sessions/webhook-deliveries'
import { createApiHandler } from '@/lib/errors'

const ALLOWED_STATUSES = new Set<WebhookDeliveryStatus>(['pending', 'delivered', 'failed'])

export const GET = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const statusParam = new URL(request.url).searchParams.get(
      'status'
    ) as WebhookDeliveryStatus | null
    const status = statusParam && ALLOWED_STATUSES.has(statusParam) ? statusParam : undefined
    const deliveries = await listWebhookDeliveries(status)
    return NextResponse.json({ deliveries })
  },
  { module: 'admin', action: 'webhook_deliveries_list' }
)
