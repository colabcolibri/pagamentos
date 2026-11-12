import { NextResponse } from 'next/server'

import { createApiHandler } from '@/lib/errors'
import { loadGatewayConfig, publicGatewayAvailability } from '@/lib/payments/gateway-config'

export const GET = createApiHandler(
  async () => {
    const availability = publicGatewayAvailability(await loadGatewayConfig())
    return NextResponse.json(availability)
  },
  { module: 'payments', action: 'gateways_get' }
)
