/**
 * Checkout Asaas à vista (Checkout API).
 * PIX e Cartão 1x — valor com desconto quando configurado. Cliente escolhe na página Asaas.
 */
import { NextRequest, NextResponse } from 'next/server'

import { createAsaasCheckoutAvistaHandler } from '@quitou/core'

import { accessCodeGateway } from '@/lib/auth/access-code-gateway'
import { publicEnv } from '@/lib/config/env'
import { createPaymentsQueryClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { sendOrderCreatedEmailFromOrder } from '@/lib/email-helpers'
import { getLogger } from '@/lib/logger'
import { createCheckoutDatabase, findCheckoutSession } from '@/lib/payments/checkout-database'
import { inactiveGatewayMessage, loadGatewayConfig } from '@/lib/payments/gateway-config'

const handler = createAsaasCheckoutAvistaHandler({
  database: createCheckoutDatabase(),
  findSession: findCheckoutSession,
  asaasApiKey: async () => {
    const config = await loadGatewayConfig()
    if (!config.asaasApiKey) throw new Error('Asaas não está ativo.')
    return config.asaasApiKey
  },
  asaasEnvironment: async () => (await loadGatewayConfig()).asaasEnvironment,
  appUrl: publicEnv.NEXT_PUBLIC_APP_URL,
  callbackBaseUrl: publicEnv.NEXT_PUBLIC_ASAAS_CALLBACK_BASE_URL ?? undefined,
  minutesToExpire: 60,
  requestAccessCode: accessCodeGateway,
  onOrderCreated: async (data) => {
    getLogger().info('Enviando email de pedido criado (Asaas à vista)', { orderId: data?.order_id })
    if (data?.order_id) {
      await sendOrderCreatedEmailFromOrder(
        createPaymentsQueryClient(getPool()) as never,
        data.order_id,
        {}
      )
    }
  },
})

export async function POST(request: NextRequest) {
  const message = inactiveGatewayMessage(await loadGatewayConfig(), 'asaas')
  if (message) return NextResponse.json({ error: message }, { status: 403 })
  return handler(request)
}
