import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { createApiHandler } from '@/lib/errors'

interface Payment {
  id: string
  user_id: string
  order_id: string | null
  status: string
  amount_cents: number
  payment_method: string | null
  payment_gateway: 'pagarme' | 'asaas'
  paid_at: string | null
  created_at: string
  payment_link_id?: string
  payment_link_url?: string
  asaas_payment_id?: string
  boleto_url?: string
  pix_qr_code?: string
}

/**
 * GET /api/admin/payments
 * Lista pagamentos de ambos os gateways (Pagar.me e Asaas)
 * - Combina pagamentos de ambos os gateways
 * - Ordena por data de criação (mais recentes primeiro)
 * - Limita a 100 registros
 * - Requer autenticação e permissão de admin
 */
export const GET = createApiHandler(
  async (_request: Request) => {
    // Verificar autenticação e admin
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const supabase = createAdminPaymentsClient()

    // Buscar pagamentos Pagar.me
    const { data: pagarmeData, error: pagarmeError } = await supabase
      .schema('payments')
      .from('pagarme_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (pagarmeError) {
      throw pagarmeError
    }

    // Buscar pagamentos Asaas
    const { data: asaasData, error: asaasError } = await supabase
      .schema('payments')
      .from('asaas_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (asaasError) {
      throw asaasError
    }

    // Combinar e ordenar por data
    const pagarmePayments: Payment[] = (pagarmeData || []).map((p: any) => ({
      ...p,
      payment_gateway: 'pagarme' as const,
    }))

    const asaasPayments: Payment[] = (asaasData || []).map((p: any) => ({
      ...p,
      payment_gateway: 'asaas' as const,
    }))

    const allPayments = [...pagarmePayments, ...asaasPayments]
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      payments: allPayments.slice(0, 100), // Limitar a 100 registros
    })
  },
  { module: 'admin', action: 'list_payments' }
)
