import { NextResponse } from 'next/server'

import { z } from 'zod'

import { createApiHandlerWithParams } from '@/lib/errors'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { findCheckoutSession } from '@/lib/payments/checkout-database'
import { type PaymentGateway, readOwnPaymentStatus } from '@/lib/payments/payment-read'
import { validateUuidParam } from '@/lib/validators/helpers'

const statusQuerySchema = z.object({
  gateway: z.enum(['pagarme', 'asaas']),
})

/**
 * GET /api/payments/[id]/status?gateway=pagarme|asaas
 * Devolve o status só do pagamento da sessão.
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

    const validation = statusQuerySchema.safeParse({ gateway: gatewayParam })
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

    const payment = await readOwnPaymentStatus(
      session.userId,
      id,
      validation.data.gateway as PaymentGateway
    )
    if (!payment) {
      return apiErrorResponse({
        error: 'Pagamento não encontrado',
        code: 'NOT_FOUND',
        status: 404,
      })
    }

    return NextResponse.json({ payment })
  },
  { module: 'payments', action: 'get_payment_status' }
)
