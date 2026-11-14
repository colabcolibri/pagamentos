import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createAdminPaymentsClient } from '@/lib/db/payments-query'
import { getPool } from '@/lib/db/pool'
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
  installments?: number | null
  customer?: { name: string | null; email: string | null } | null
  product?: { name: string; ref: string | null } | null
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

    const [{ data: pagarmeData, error: pagarmeError }, { data: asaasData, error: asaasError }] =
      await Promise.all([
        supabase
          .schema('payments')
          .from('pagarme_payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .schema('payments')
          .from('asaas_payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ])

    if (pagarmeError) {
      throw pagarmeError
    }

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
    const sliced = allPayments.slice(0, 100)

    const userIds = Array.from(new Set(sliced.map((p) => p.user_id).filter(Boolean)))
    const orderIds = Array.from(
      new Set(sliced.map((p) => p.order_id).filter((id): id is string => Boolean(id)))
    )

    const pool = getPool()
    const [profilesRes, ordersRes] = await Promise.all([
      userIds.length > 0
        ? pool.query<{ id: string; name: string | null; email: string | null }>(
            'SELECT id, name, email FROM payments.profiles WHERE id = ANY($1::uuid[])',
            [userIds]
          )
        : Promise.resolve({ rows: [] }),
      orderIds.length > 0
        ? pool.query<{
            id: string
            product_name: string | null
            product_ref: string | null
          }>(
            `SELECT o.id, pr.name AS product_name, pr.ref AS product_ref
             FROM payments.orders o
             LEFT JOIN payments.products pr ON pr.id = o.product_id
             WHERE o.id = ANY($1::uuid[])`,
            [orderIds]
          )
        : Promise.resolve({ rows: [] }),
    ])

    const profileMap = new Map(
      profilesRes.rows.map((r) => [r.id, { name: r.name, email: r.email }])
    )
    const orderMap = new Map(ordersRes.rows.map((r) => [r.id, r]))

    const enriched = sliced.map((p) => {
      const orderInfo = p.order_id ? orderMap.get(p.order_id) : undefined
      return {
        ...p,
        installments: p.installments ?? null,
        customer: profileMap.get(p.user_id) ?? null,
        product: orderInfo?.product_name
          ? { name: orderInfo.product_name, ref: orderInfo.product_ref }
          : null,
      }
    })

    return NextResponse.json({
      payments: enriched,
    })
  },
  { module: 'admin', action: 'list_payments' }
)
