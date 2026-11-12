'use client'

import { useQuery } from '@tanstack/react-query'

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

async function fetchPayments(): Promise<Payment[]> {
  const response = await fetch('/api/admin/payments')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao buscar pagamentos')
  }

  const { payments } = await response.json()
  return payments || []
}

export function usePayments() {
  return useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: fetchPayments,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}
