import { NextResponse } from 'next/server'

import { recordAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { validateUuidParam } from '@/lib/validators/helpers'

/**
 * POST /api/admin/orders/[id]/delete-permanent
 * Exclusão permanente (hard delete) do pedido.
 * - Só pedidos com status `cancelled`.
 * - Admin: só permite se não houver pagamentos vinculados.
 * - Super_admin: permite mesmo com pagamentos (desvincula e remove o pedido).
 * Uso com parcimônia; confirmação obrigatória no front.
 */
export const POST = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const logger = getLogger()
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { user } = authResult
    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const supabaseAdmin = createAdminPaymentsClient()
    const schema = supabaseAdmin.schema('payments')

    const { data: order, error: orderError } = await schema
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (orderError) {
      logger.error('Erro ao buscar pedido para exclusão permanente', { id, error: orderError })
      return NextResponse.json({ error: 'Erro ao verificar pedido' }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.status !== 'cancelled') {
      return NextResponse.json(
        {
          error:
            'Só é permitido excluir permanentemente pedidos cancelados. Cancele o pedido antes.',
        },
        { status: 403 }
      )
    }

    const { count: pagarmeCount } = await schema
      .from('pagarme_payments')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', id)

    const { count: asaasCount } = await schema
      .from('asaas_payments')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', id)

    const hasPayments = (pagarmeCount ?? 0) > 0 || (asaasCount ?? 0) > 0
    const role = await getPool().query<{ role: string }>(
      `SELECT role FROM payments.admin_users WHERE id = $1 AND is_active IS TRUE`,
      [user.id]
    )
    const isSuperAdmin = role.rows[0]?.role === 'super_admin'

    if (hasPayments && !isSuperAdmin) {
      return NextResponse.json(
        {
          error:
            'Apenas super_admin pode excluir permanentemente pedidos com pagamentos vinculados.',
          code: 'REQUIRES_SUPER_ADMIN',
        },
        { status: 403 }
      )
    }

    if (hasPayments && isSuperAdmin) {
      const { error: errPagarme } = await schema
        .from('pagarme_payments')
        .update({ order_id: null })
        .eq('order_id', id)

      if (errPagarme) {
        logger.error('Erro ao desvincular pagarme_payments', { id, error: errPagarme })
        return NextResponse.json({ error: 'Erro ao desvincular pagamentos' }, { status: 500 })
      }

      const { error: errAsaas } = await schema
        .from('asaas_payments')
        .update({ order_id: null })
        .eq('order_id', id)

      if (errAsaas) {
        logger.error('Erro ao desvincular asaas_payments', { id, error: errAsaas })
        return NextResponse.json({ error: 'Erro ao desvincular pagamentos' }, { status: 500 })
      }
    }

    const { error: deleteError } = await schema.from('orders').delete().eq('id', id)

    if (deleteError) {
      logger.error('Erro ao excluir pedido permanentemente', { id, error: deleteError })
      return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 })
    }

    await recordAdminAction(getPool(), {
      actorId: user.id,
      action: 'order.delete',
      targetType: 'order',
      targetId: id,
    })
    logger.info('Pedido excluído permanentemente', { orderId: id, userId: user.id })
    return new NextResponse(null, { status: 204 })
  },
  { module: 'admin', action: 'delete_order_permanent' }
)
