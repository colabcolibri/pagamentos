import { NextResponse } from 'next/server'

import { sendPaymentConfirmedProductWebhook } from '@quitou/core/product-webhook'

import { recordAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { sendPlatformSaleNotificationForOrderId } from '@/lib/email-helpers'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { validateUuidParam } from '@/lib/validators/helpers'

const ALLOWED_ORDER_STATUSES = ['pending', 'failed', 'expired'] as const

function isPaidLikeStatus(status: string | null): boolean {
  return status === 'paid' || status === 'approved'
}

function isUpdatablePaymentStatus(status: string | null): boolean {
  if (!status) return false
  return status === 'pending' || status === 'failed' || status === 'expired'
}

function createPaymentsSchemaServiceClient() {
  return createAdminPaymentsClient() as Parameters<typeof sendPaymentConfirmedProductWebhook>[0]
}

/**
 * POST /api/admin/orders/[id]/mark-paid
 * Conciliação manual: marca pedido e cobranças vinculadas como pagos (ex.: Pagar.me antigo sem webhook).
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
      .select(
        'id, status, deleted_at, payment_gateway, payment_method, subscription_id, order_type'
      )
      .eq('id', id)
      .maybeSingle()

    if (orderErr) {
      logger.error('Erro ao buscar pedido para marcar como pago', { id, error: orderErr })
      return NextResponse.json({ error: 'Erro ao verificar pedido' }, { status: 500 })
    }

    if (!orderRow) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (orderRow.deleted_at) {
      return NextResponse.json(
        { error: 'Este pedido foi removido e não pode ser alterado.' },
        { status: 400 }
      )
    }

    if (orderRow.status === 'paid') {
      return NextResponse.json({ ok: true, status: 'paid', alreadyPaid: true })
    }

    if (!(ALLOWED_ORDER_STATUSES as readonly string[]).includes(orderRow.status ?? '')) {
      return NextResponse.json(
        {
          error: `Só é possível marcar como pago pedidos pendentes, falhos ou expirados. Status atual: ${orderRow.status}.`,
        },
        { status: 403 }
      )
    }

    const { data: pagarmeRows, error: pgErr } = await supabaseAdmin
      .schema('payments')
      .from('pagarme_payments')
      .select('id, status, payment_method')
      .eq('order_id', id)

    if (pgErr) {
      logger.error('Erro ao listar pagamentos Pagar.me do pedido', { id, error: pgErr })
      return NextResponse.json({ error: 'Erro ao verificar cobranças vinculadas' }, { status: 500 })
    }

    const { data: asaasRows, error: asaasErr } = await supabaseAdmin
      .schema('payments')
      .from('asaas_payments')
      .select('id, status, payment_method')
      .eq('order_id', id)

    if (asaasErr) {
      logger.error('Erro ao listar pagamentos Asaas do pedido', { id, error: asaasErr })
      return NextResponse.json({ error: 'Erro ao verificar cobranças vinculadas' }, { status: 500 })
    }

    const pg = pagarmeRows ?? []
    const as = asaasRows ?? []

    if (pg.length === 0 && as.length === 0) {
      return NextResponse.json(
        {
          error:
            'Nenhuma cobrança (Pagar.me ou Asaas) vinculada a este pedido. Não é possível marcar como pago por aqui.',
        },
        { status: 400 }
      )
    }

    for (const row of [...pg, ...as]) {
      if (row.status === 'cancelled' || row.status === 'refunded') {
        return NextResponse.json(
          {
            error: `Não é possível marcar como pago: existe cobrança com status "${row.status}".`,
          },
          { status: 409 }
        )
      }
      if (!isPaidLikeStatus(row.status) && !isUpdatablePaymentStatus(row.status)) {
        return NextResponse.json(
          {
            error: `Status de cobrança não suportado para conciliação manual: ${row.status ?? 'null'}.`,
          },
          { status: 400 }
        )
      }
    }

    const paidAt = new Date().toISOString()
    const orderPaymentMethod = orderRow.payment_method ?? 'unknown'

    for (const row of pg) {
      if (isPaidLikeStatus(row.status)) continue
      const { error: upErr } = await supabaseAdmin
        .schema('payments')
        .from('pagarme_payments')
        .update({
          status: 'paid',
          paid_at: paidAt,
          payment_method: row.payment_method ?? orderPaymentMethod,
        })
        .eq('id', row.id)

      if (upErr) {
        logger.error('Falha ao atualizar pagarme_payments para paid', { id: row.id, error: upErr })
        return NextResponse.json({ error: 'Erro ao atualizar cobrança Pagar.me' }, { status: 500 })
      }
    }

    for (const row of as) {
      if (isPaidLikeStatus(row.status)) continue
      const { error: upErr } = await supabaseAdmin
        .schema('payments')
        .from('asaas_payments')
        .update({
          status: 'paid',
          paid_at: paidAt,
          payment_method: row.payment_method ?? orderPaymentMethod,
        })
        .eq('id', row.id)

      if (upErr) {
        logger.error('Falha ao atualizar asaas_payments para paid', { id: row.id, error: upErr })
        return NextResponse.json({ error: 'Erro ao atualizar cobrança Asaas' }, { status: 500 })
      }
    }

    try {
      await getPool().query(
        `UPDATE payments.orders SET status = 'paid', paid_at = $2 WHERE id = $1`,
        [id, paidAt]
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logger.error('Falha ao marcar pedido como pago', { id, message })
      return NextResponse.json(
        {
          error:
            'Cobranças foram atualizadas, mas falhou ao marcar o pedido como pago. Corrija manualmente ou tente de novo.',
        },
        { status: 500 }
      )
    }

    if (orderRow.subscription_id && orderRow.order_type === 'subscription') {
      const { data: sub, error: subErr } = await supabaseAdmin
        .schema('payments')
        .from('subscriptions')
        .select('id, status')
        .eq('id', orderRow.subscription_id)
        .maybeSingle()

      if (!subErr && sub && sub.status !== 'active' && sub.status !== 'canceled') {
        const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        const { error: actErr } = await supabaseAdmin
          .schema('payments')
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: paidAt,
            current_period_end: periodEnd,
          })
          .eq('id', sub.id)

        if (actErr) {
          logger.warn('Pedido marcado como pago, mas falha ao ativar assinatura', {
            subscriptionId: sub.id,
            error: actErr,
          })
        }
      }
    }

    try {
      await sendPaymentConfirmedProductWebhook(createPaymentsSchemaServiceClient(), id)
    } catch (whErr) {
      logger.warn('Pedido marcado como pago, mas falha ao disparar webhook do produto', {
        orderId: id,
        error: whErr,
      })
    }

    try {
      await sendPlatformSaleNotificationForOrderId(createPaymentsSchemaServiceClient(), id)
    } catch (saleNotifyErr) {
      logger.warn('Pedido marcado como pago, mas falha ao enviar aviso interno de venda', {
        orderId: id,
        error: saleNotifyErr,
      })
    }

    await recordAdminAction(getPool(), {
      actorId: authResult.user.id,
      action: 'order.mark_paid',
      targetType: 'order',
      targetId: id,
    })
    return NextResponse.json({ ok: true, status: 'paid' })
  },
  { module: 'admin', action: 'mark_order_paid' }
)
