/**
 * Webhook Asaas - Wrapper que usa @quitou/core
 */
import { createAsaasWebhookHandler } from '@quitou/core'
import { sendPaymentConfirmedProductWebhook } from '@quitou/core/product-webhook'

import { createPaymentsQueryClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { sendPaymentConfirmedEmailFromOrder } from '@/lib/email-helpers'
import { getLogger } from '@/lib/logger'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'
import { timingSafeStringEqual } from '@/lib/security/timing-safe-string-equal'

const supabase = new Proxy({} as ReturnType<typeof createPaymentsQueryClient>, {
  get(_target, prop, receiver) {
    const client = createPaymentsQueryClient(getPool())
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Criar handler configurado
const handler = createAsaasWebhookHandler({
  validateToken: async (token: string) => {
    const secret = (await loadGatewayConfig()).asaasWebhookSecret
    if (!secret || !token) return false
    return timingSafeStringEqual(token, secret)
  },
  payments: supabase,
  onSuccess: async (payment: any) => {
    getLogger().info('Webhook Asaas processado com sucesso')
    if (payment?.order_id) {
      await sendPaymentConfirmedEmailFromOrder(supabase, payment.order_id)
      await sendPaymentConfirmedProductWebhook(supabase, payment.order_id)
    }
  },
  onError: async (error: Error) => {
    getLogger().error('Erro ao processar webhook Asaas', error)
  },
})

export const POST = handler
