import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { createApiHandlerWithParams } from '@/lib/errors'
import { getLogger } from '@/lib/logger'
import { validateUuidParam } from '@/lib/validators/helpers'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * DELETE /api/admin/payments/[id]?gateway=pagarme|asaas
 * Remove o registro de pagamento. Só é permitido quando o link já foi cancelado (status = cancelled).
 * Fluxo: primeiro POST .../cancel, depois DELETE.
 */
export const DELETE = createApiHandlerWithParams(
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
    const tableName = gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'

    const { data: row, error: fetchError } = await supabase
      .schema('payments')
      .from(tableName)
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      logger.error('Erro ao buscar pagamento para exclusão', { id, gateway, error: fetchError })
      return NextResponse.json({ error: 'Erro ao verificar pagamento' }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    if (row.status !== 'cancelled') {
      return NextResponse.json(
        {
          error:
            'Só é permitido excluir após cancelar o link. Cancele o link de pagamento primeiro.',
        },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .schema('payments')
      .from(tableName)
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Erro ao deletar pagamento', { id, gateway, error: deleteError })
      const message = IS_PRODUCTION
        ? 'Erro ao excluir pagamento'
        : deleteError.message || 'Erro ao excluir pagamento'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  },
  { module: 'admin', action: 'delete_payment' }
)
