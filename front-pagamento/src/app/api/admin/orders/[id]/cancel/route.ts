import { NextResponse } from 'next/server'

import { recordAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import {
  cancelAdminPaymentLink,
  isAdminPaymentConfirmedForOrderCancel,
} from '@/lib/payments/admin-cancel-payment-link'
import { validateUuidParam } from '@/lib/validators/helpers'

const ORDER_CANCEL_ALLOWED_STATUSES = ['pending', 'failed', 'expired'] as const

/**
 * POST /api/admin/orders/[id]/cancel
 * Cancela cobranças/links vinculadas ao pedido (Pagar.me/Asaas) e marca o pedido como cancelled.
 */
export const POST = createApiHandlerWithParams(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const logger = getLogger()
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const supabaseAdmin = createAdminPaymentsClient()

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .schema('payments')
      .from('orders')
      .select('id, status, deleted_at')
      .eq('id', id)
      .maybeSingle()

    if (orderErr) {
      logger.error('Erro ao buscar pedido para cancelar', { id, error: orderErr })
      return NextResponse.json({ error: 'Erro ao verificar pedido' }, { status: 500 })
    }

    if (!orderRow) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (orderRow.deleted_at) {
      return NextResponse.json(
        { error: 'Este pedido foi removido e não pode ser cancelado.' },
        { status: 400 }
      )
    }

    if (orderRow.status === 'cancelled') {
      return NextResponse.json({ ok: true, status: 'cancelled', alreadyCancelled: true })
    }

    if (!(ORDER_CANCEL_ALLOWED_STATUSES as readonly string[]).includes(orderRow.status ?? '')) {
      return NextResponse.json(
        {
          error: `Só é possível cancelar pedidos pendentes, falhos ou expirados. Status atual: ${orderRow.status}.`,
        },
        { status: 403 }
      )
    }

    const [{ data: pagarmeRows, error: pgErr }, { data: asaasRows, error: asaasErr }] =
      await Promise.all([
        supabaseAdmin
          .schema('payments')
          .from('pagarme_payments')
          .select('id, status, payment_link_id')
          .eq('order_id', id),
        supabaseAdmin
          .schema('payments')
          .from('asaas_payments')
          .select('id, status, asaas_payment_id, asaas_checkout_id, asaas_installment_id')
          .eq('order_id', id),
      ])

    if (pgErr) {
      logger.error('Erro ao listar pagamentos Pagarme do pedido', { id, error: pgErr })
      return NextResponse.json({ error: 'Erro ao verificar cobranças vinculadas' }, { status: 500 })
    }

    if (asaasErr) {
      logger.error('Erro ao listar pagamentos Asaas do pedido', { id, error: asaasErr })
      return NextResponse.json({ error: 'Erro ao verificar cobranças vinculadas' }, { status: 500 })
    }

    type CancelablePaymentRow = { id: string; status: string | null }
    const pagarmeList: CancelablePaymentRow[] = pagarmeRows ?? []
    const asaasList: CancelablePaymentRow[] = asaasRows ?? []

    for (const row of pagarmeList) {
      if (row.status !== 'cancelled' && isAdminPaymentConfirmedForOrderCancel(row.status)) {
        return NextResponse.json(
          {
            error: `Não é possível cancelar: cobrança Pagar.me confirmada (status ${row.status}).`,
          },
          { status: 409 }
        )
      }
    }
    for (const row of asaasList) {
      if (row.status !== 'cancelled' && isAdminPaymentConfirmedForOrderCancel(row.status)) {
        return NextResponse.json(
          {
            error: `Não é possível cancelar: cobrança Asaas confirmada (status ${row.status}).`,
          },
          { status: 409 }
        )
      }
    }

    const paymentLogger = getLogger()
    const cancelTargets = [
      ...pagarmeList
        .filter((row) => row.status !== 'cancelled')
        .map((row) => ({ paymentRowId: row.id, gateway: 'pagarme' as const })),
      ...asaasList
        .filter((row) => row.status !== 'cancelled')
        .map((row) => ({ paymentRowId: row.id, gateway: 'asaas' as const })),
    ]

    const cancelResults = await Promise.all(
      cancelTargets.map(async (target) => ({
        ...target,
        result: await cancelAdminPaymentLink({
          supabase: supabaseAdmin,
          paymentRowId: target.paymentRowId,
          gateway: target.gateway,
          logger: paymentLogger,
        }),
      }))
    )

    const failedCancel = cancelResults.find((item) => !item.result.ok)
    if (failedCancel && !failedCancel.result.ok) {
      return NextResponse.json(
        {
          error: failedCancel.result.error,
          paymentId: failedCancel.paymentRowId,
          gateway: failedCancel.gateway,
        },
        { status: failedCancel.result.status }
      )
    }

    try {
      await getPool().query(
        `UPDATE payments.orders
         SET status = 'cancelled', cancelled_at = now()
         WHERE id = $1
           AND status IN ('pending', 'failed', 'expired')`,
        [id]
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logger.error('Falha ao marcar pedido como cancelado', { id, message })
      return NextResponse.json(
        {
          error:
            'Cobranças foram canceladas no gateway, mas falha ao marcar pedido como cancelado. Atualize manualmente ou entre em contato com suporte.',
        },
        { status: 500 }
      )
    }

    await recordAdminAction(getPool(), {
      actorId: authResult.user.id,
      action: 'order.cancel',
      targetType: 'order',
      targetId: id,
    })
    return NextResponse.json({ ok: true, status: 'cancelled' })
  },
  { module: 'admin', action: 'cancel_order' }
)
