import { NextResponse } from 'next/server'

import { recordAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { cancelAdminPaymentLink } from '@/lib/payments/admin-cancel-payment-link'
import { validateUuidParam } from '@/lib/validators/helpers'

/**
 * POST /api/admin/payments/[id]/cancel?gateway=pagarme|asaas
 * Cancela a cobrança no gateway e atualiza o status para 'cancelled'.
 * Só depois disso o pagamento pode ser excluído (DELETE).
 */
export const POST = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const logger = getLogger()
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const { searchParams } = new URL(request.url)
    const gateway = searchParams.get('gateway')
    if (gateway !== 'pagarme' && gateway !== 'asaas') {
      return NextResponse.json(
        { error: 'Parâmetro gateway obrigatório: pagarme ou asaas' },
        { status: 400 }
      )
    }

    const supabase = createAdminPaymentsClient()
    const result = await cancelAdminPaymentLink({
      supabase,
      paymentRowId: id,
      gateway,
      logger,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await recordAdminAction(getPool(), {
      actorId: authResult.user.id,
      action: 'payment.cancel',
      targetType: 'payment',
      targetId: id,
    })
    return NextResponse.json({ ok: true, status: 'cancelled' })
  },
  { module: 'admin', action: 'cancel_payment' }
)
