import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import {
  sendOrderCreatedEmailFromOrder,
  sendPaymentConfirmedEmailFromOrder,
} from '@/lib/email-helpers'
import { createApiHandler } from '@/lib/errors'
import { readAdminOrder } from '@/lib/payments/admin-orders'
import { orderValidators } from '@/lib/payments/order'
import { validateRequest } from '@/lib/validators/helpers'

/**
 * POST /api/admin/resend-email
 * Reenvia email de pedido (order_created ou payment_confirmed)
 */
export const POST = createApiHandler(
  async (request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json()
    const validation = validateRequest(orderValidators.resendEmail, body)
    if (!validation.success) {
      return validation.response
    }

    const { orderId, emailType } = validation.data
    const order = await readAdminOrder(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const database = createAdminPaymentsClient()
    const result =
      emailType === 'order_created'
        ? await sendOrderCreatedEmailFromOrder(database, orderId, undefined, undefined, true)
        : await sendPaymentConfirmedEmailFromOrder(database, orderId, undefined, true)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Falha ao enviar e-mail' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email reenviado com sucesso!',
    })
  },
  { module: 'admin', action: 'resend_email' }
)
