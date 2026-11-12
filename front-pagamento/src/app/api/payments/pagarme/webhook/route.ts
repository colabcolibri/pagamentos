/**
 * Webhook Pagar.me - Wrapper que usa @quitou/core
 */
import { createPagarmeWebhookHandler } from '@quitou/core'
import { sendPaymentConfirmedProductWebhook } from '@quitou/core/product-webhook'

import { createPaymentsQueryClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import {
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from '@/lib/email-helpers'
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
const handler = createPagarmeWebhookHandler({
  validateAuth: async (username: string, password: string) => {
    const config = await loadGatewayConfig()
    if (!config.pagarmeWebhookUser || !config.pagarmeWebhookSecret) return false
    return (
      timingSafeStringEqual(username, config.pagarmeWebhookUser) &&
      timingSafeStringEqual(password, config.pagarmeWebhookSecret)
    )
  },
  payments: supabase,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOrderCreated: async (result: any) => {
    getLogger().info('Enviando email de order.created (PIX/Boleto)')
    // Enviar email de pedido criado se tiver order_id
    if (result?.order_id && result?.payment) {
      await sendOrderCreatedEmailFromOrder(
        supabase,
        result.order_id,
        {
          pixQrCode: result.payment.pix_qr_code,
          pixCopyPaste: result.payment.pix_copy_paste,
          boletoUrl: result.payment.boleto_url,
          boletoLine: result.payment.boleto_line, // Linha digitável
          boletoBarcode: result.payment.boleto_barcode, // URL da imagem do código de barras
        },
        result.webhook_event_id
      )
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: async (payment: any) => {
    getLogger().info('Webhook Pagar.me processado com sucesso (order.paid)')
    // Enviar email de pagamento confirmado se tiver order_id
    if (payment?.order_id) {
      await sendPaymentConfirmedEmailFromOrder(supabase, payment.order_id, payment.webhook_event_id)
      await sendPaymentConfirmedProductWebhook(supabase, payment.order_id)
    }
  },
  onError: async (error: Error) => {
    getLogger().error('Erro ao processar webhook', error)
  },
})

export const POST = handler
