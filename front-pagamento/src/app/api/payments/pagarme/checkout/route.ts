/**
 * Checkout Pagar.me - Wrapper que usa @quitou/core
 */
import { NextRequest, NextResponse } from 'next/server'

import { createPagarmeCheckoutHandler } from '@quitou/core'

import { accessCodeGateway } from '@/lib/auth/access-code-gateway'
import { publicEnv } from '@/lib/config/env'
import { createCheckoutDatabase, findCheckoutSession } from '@/lib/payments/checkout-database'
import { inactiveGatewayMessage, loadGatewayConfig } from '@/lib/payments/gateway-config'

const handler = createPagarmeCheckoutHandler({
  database: createCheckoutDatabase(),
  findSession: findCheckoutSession,
  pagarmeSecretKey: async () => {
    const config = await loadGatewayConfig()
    if (!config.pagarmeSecretKey) throw new Error('Pagar.me não está ativo.')
    return config.pagarmeSecretKey
  },
  pagarmeEnvironment: async () => (await loadGatewayConfig()).pagarmeEnvironment,
  appUrl: publicEnv.NEXT_PUBLIC_APP_URL,
  maxInstallments: 12,
  expiresInMinutes: 60 * 24 * 15,
  requestAccessCode: accessCodeGateway,
})

export async function POST(request: NextRequest) {
  const message = inactiveGatewayMessage(await loadGatewayConfig(), 'pagarme')
  if (message) return NextResponse.json({ error: message }, { status: 403 })
  return handler(request)
}
