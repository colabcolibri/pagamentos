import { NextResponse } from 'next/server'

import { z } from 'zod'

import { createApiHandlerWithParams } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { findCheckoutSession } from '@/lib/payments/checkout-database'
import { type PaymentGateway, readOwnPaymentConfirmation } from '@/lib/payments/payment-read'
import { validateUuidParam } from '@/lib/validators/helpers'

const querySchema = z.object({
  gateway: z.enum(['pagarme', 'asaas']),
})

/**
 * GET /api/payments/[id]/confirmation?gateway=pagarme|asaas
 * Resumo do pedido só para o dono do pagamento.
 */
export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const { searchParams } = new URL(request.url)
    const gatewayParam = searchParams.get('gateway')

    if (!gatewayParam) {
      return apiErrorResponse({
        error: 'Parâmetro gateway é obrigatório',
        code: 'INVALID_REQUEST',
        status: 400,
      })
    }

    const validation = querySchema.safeParse({ gateway: gatewayParam })
    if (!validation.success) {
      return apiErrorResponse({
        error: 'Gateway inválido. Use "pagarme" ou "asaas"',
        code: 'INVALID_REQUEST',
        status: 400,
      })
    }

    const session = await findCheckoutSession(request)
    if (!session) {
      return apiErrorResponse({
        error: 'Não autenticado',
        code: 'UNAUTHORIZED',
        status: 401,
      })
    }

    const gateway = validation.data.gateway as PaymentGateway
    const payment = await readOwnPaymentConfirmation(session.userId, id, gateway)
    if (!payment) {
      return apiErrorResponse({
        error: 'Pagamento não encontrado',
        code: 'NOT_FOUND',
        status: 404,
      })
    }

    let installments: number | null = gateway === 'asaas' ? (payment.installments ?? null) : null
    if (gateway === 'pagarme') {
      const meta = payment.metadata as { installments?: number } | null
      if (meta && typeof meta.installments === 'number') installments = meta.installments
    }

    const priceMeta = payment.price_metadata as { success_message?: unknown } | null
    const productMeta = payment.product_metadata as { success_message?: unknown } | null
    const priceMsg =
      priceMeta?.success_message != null ? String(priceMeta.success_message).trim() : ''
    const productMsg =
      productMeta?.success_message != null ? String(productMeta.success_message).trim() : ''
    const successMessage = priceMsg || productMsg || null
    const orderId = (payment.order_id as string | null) ?? null

    const amountCents = Number(payment.amount_cents ?? 0)
    const formattedPrice = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amountCents / 100)

    const paymentMethodLabels: Record<string, string> = {
      pix: 'PIX',
      boleto: 'Boleto',
      credit_card: 'Cartão de crédito',
    }
    const rawMethod = payment.payment_method ? String(payment.payment_method) : ''
    const paymentMethod =
      paymentMethodLabels[rawMethod] || (rawMethod ? rawMethod.toUpperCase() : 'PIX ou Boleto')

    return NextResponse.json({
      order_id: orderId,
      order_id_short: orderId ? orderId.slice(0, 8).toUpperCase() : null,
      product_name: (payment.product_name as string | null) ?? null,
      amount_cents: amountCents,
      formatted_price: formattedPrice,
      installments,
      payment_method: paymentMethod,
      success_message: successMessage,
    })
  },
  { module: 'payments', action: 'get_confirmation_details' }
)
