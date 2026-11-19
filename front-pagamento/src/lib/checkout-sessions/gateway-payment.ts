import { randomUUID } from 'node:crypto'

import { getPool } from '@/lib/db/pool'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'

import { CheckoutSessionError } from './service'

export interface GatewayOrderPaymentInput {
  orderId: string
  profileId: string
  productId: string
  productName: string
  priceId: string | null
  amountCents: number
  metadata: Record<string, unknown>
  customerEmail: string
  customerName: string
  customerDocument: string
  personType: 'individual' | 'company'
  billingType?: string
  installments?: number
}

export interface GatewayOrderPaymentOutput {
  paymentId: string
  payment_id: string
  orderId: string
  paymentUrl: string
  checkoutUrl: string
  payment_url: string
  amountCents: number
}

export async function createPagarmePaymentForOrder(
  input: GatewayOrderPaymentInput
): Promise<GatewayOrderPaymentOutput> {
  const config = await loadGatewayConfig()
  if (!config.pagarmeSecretKey) {
    throw new CheckoutSessionError(403, 'Pagar.me não está ativo.')
  }

  const { createPagarmeService } = await import('@quitou/core')
  const pagarmeService = createPagarmeService(config.pagarmeSecretKey, config.pagarmeEnvironment)

  const billingType = input.billingType ?? 'PIX'
  const isCard = billingType === 'CREDIT_CARD'
  const isBoleto = billingType === 'BOLETO'
  const installments = Math.min(12, Math.max(1, input.installments ?? 1))
  const acceptedMethods = isCard ? ['credit_card'] : isBoleto ? ['boleto'] : ['pix', 'boleto']

  const paymentLink = await pagarmeService.createPaymentLink({
    is_building: false,
    name: `${input.productName} (${input.orderId.slice(0, 8)})`,
    type: 'order',
    payment_settings: {
      accepted_payment_methods: acceptedMethods as Array<'credit_card' | 'pix' | 'boleto'>,
      credit_card_settings: {
        operation_type: 'auth_and_capture',
        installments: Array.from({ length: installments }, (_, idx) => ({
          number: idx + 1,
          total: input.amountCents,
        })),
      },
      boleto_settings: {
        due_in: 3,
        instructions: `Pagamento do produto ${input.productName}.`,
      },
      pix_settings: {
        expires_in: 72 * 60 * 60,
      },
    },
    cart_settings: {
      items: [
        {
          amount: input.amountCents,
          name: input.productName,
          default_quantity: 1,
        },
      ],
    },
    customer_settings: {
      customer: {
        name: input.customerName,
        email: input.customerEmail,
        document: input.customerDocument,
        type: 'individual',
      },
    },
    order_code: input.orderId,
  })

  const paymentId = randomUUID()
  await getPool().query(
    `INSERT INTO payments.pagarme_payments (
       id, order_id, user_id, product_id, price_id, amount_cents,
       payment_link_id, payment_link_url, payment_method, status, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10::jsonb)`,
    [
      paymentId,
      input.orderId,
      input.profileId,
      input.productId,
      input.priceId,
      input.amountCents,
      paymentLink.id,
      paymentLink.url,
      billingType,
      JSON.stringify(input.metadata),
    ]
  )

  return {
    paymentId,
    payment_id: paymentId,
    orderId: input.orderId,
    paymentUrl: paymentLink.url,
    checkoutUrl: paymentLink.url,
    payment_url: paymentLink.url,
    amountCents: input.amountCents,
  }
}
