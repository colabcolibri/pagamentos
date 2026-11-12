import { createAsaasService, createPagarmeService } from '@quitou/core'

import { getLogger } from '@/lib/logger'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'

export type AdminPaymentsClient = {
  schema: (name: string) => any
}

const STATUS_BLOCK_CANCEL = ['paid', 'approved'] as const
const STATUS_ALREADY_CANCELLED = ['cancelled'] as const

export const ADMIN_PAYMENT_STATUS_BLOCK_CANCEL = STATUS_BLOCK_CANCEL

export function isAdminPaymentConfirmedForOrderCancel(status: string | null): boolean {
  if (!status) return false
  return (STATUS_BLOCK_CANCEL as readonly string[]).includes(status)
}

/**
 * Gateway já encerrou a cobrança/link (nada a cancelar no provedor).
 * — Pagar.me: expirado, não pode ir para cancelled.
 * — Asaas: checkout inativo (expirado, pago, já encerrado, etc.).
 * Em todos os casos seguimos com status = cancelled no banco.
 */
function isGatewayAlreadyInactiveError(message: string): boolean {
  const lower = message.toLowerCase()
  if (
    message.includes("from 'expired' status to 'cancelled'") ||
    (message.includes('expired') && lower.includes('cancelled'))
  ) {
    return true
  }
  if (
    lower.includes('invalid_action') &&
    (lower.includes('não está ativo') ||
      lower.includes('nao esta ativo') ||
      lower.includes('checkout não está ativo'))
  ) {
    return true
  }
  return false
}

type CancelLinkRow = {
  id: string
  status: string | null
  payment_link_id?: string
  asaas_payment_id?: string | null
  asaas_checkout_id?: string | null
  asaas_installment_id?: string | null
}

/**
 * Cancela cobrança/link no gateway e marca `status = cancelled` na tabela correspondente.
 * Mesma regra de POST /api/admin/payments/[id]/cancel.
 */
export async function cancelAdminPaymentLink(options: {
  supabase: AdminPaymentsClient
  paymentRowId: string
  gateway: 'pagarme' | 'asaas'
  logger: ReturnType<typeof getLogger>
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { supabase, paymentRowId, gateway, logger } = options
  const tableName = gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments'
  const selectColumns =
    gateway === 'pagarme'
      ? 'id, status, payment_link_id'
      : 'id, status, asaas_payment_id, asaas_checkout_id, asaas_installment_id'

  const { data, error: fetchError } = await supabase
    .schema('payments')
    .from(tableName)
    .select(selectColumns)
    .eq('id', paymentRowId)
    .maybeSingle()

  const row = data as CancelLinkRow | null

  if (fetchError) {
    logger.error('Erro ao buscar pagamento para cancelar', {
      id: paymentRowId,
      gateway,
      error: fetchError,
    })
    return { ok: false, error: 'Erro ao verificar pagamento', status: 500 }
  }

  if (!row) {
    return { ok: false, error: 'Pagamento não encontrado', status: 404 }
  }

  if (row.status && (STATUS_BLOCK_CANCEL as readonly string[]).includes(row.status)) {
    return {
      ok: false,
      error:
        'Não é permitido cancelar link de pagamento já realizado (status: ' + row.status + ').',
      status: 403,
    }
  }

  if (row.status && (STATUS_ALREADY_CANCELLED as readonly string[]).includes(row.status)) {
    return {
      ok: false,
      error: 'Cobrança já foi cancelada. Use Excluir para remover o registro.',
      status: 400,
    }
  }

  try {
    if (gateway === 'pagarme') {
      const paymentLinkId = (row as { payment_link_id?: string }).payment_link_id
      if (!paymentLinkId) {
        return { ok: false, error: 'Pagamento sem payment_link_id', status: 400 }
      }
      const config = await loadGatewayConfig()
      if (!config.pagarmeSecretKey) {
        return { ok: false, error: 'Pagar.me não está configurado', status: 503 }
      }
      const pagarme = createPagarmeService(config.pagarmeSecretKey, config.pagarmeEnvironment)
      await pagarme.cancelPaymentLink(paymentLinkId)
    } else {
      const asaasRow = row as {
        asaas_payment_id?: string | null
        asaas_checkout_id?: string | null
        asaas_installment_id?: string | null
      }
      const config = await loadGatewayConfig()
      if (!config.asaasApiKey) {
        return { ok: false, error: 'Asaas não está configurado', status: 503 }
      }
      const asaas = createAsaasService(config.asaasApiKey, config.asaasEnvironment)
      if (asaasRow.asaas_payment_id) {
        await asaas.deletePayment(asaasRow.asaas_payment_id)
      } else if (asaasRow.asaas_checkout_id) {
        await asaas.cancelCheckout(asaasRow.asaas_checkout_id)
      } else if (asaasRow.asaas_installment_id) {
        await asaas.cancelInstallmentPayments(asaasRow.asaas_installment_id)
      } else {
        return {
          ok: false,
          error: 'Pagamento sem asaas_payment_id, asaas_checkout_id ou asaas_installment_id',
          status: 400,
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isGatewayAlreadyInactiveError(message)) {
      logger.info('Cobrança já encerrada ou inativa no gateway; atualizando apenas o banco', {
        id: paymentRowId,
        gateway,
      })
    } else {
      logger.error('Erro ao cancelar no gateway', { id: paymentRowId, gateway, message })
      return { ok: false, error: message, status: 502 }
    }
  }

  const { error: updateError } = await supabase
    .schema('payments')
    .from(tableName)
    .update({ status: 'cancelled' })
    .eq('id', paymentRowId)

  if (updateError) {
    logger.error('Cancelado no gateway mas falha ao atualizar status', {
      id: paymentRowId,
      gateway,
      error: updateError,
    })
    return {
      ok: false,
      error: 'Cobrança cancelada no gateway, mas falha ao atualizar status. Tente recarregar.',
      status: 500,
    }
  }

  return { ok: true }
}
