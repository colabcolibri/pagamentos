'use client'

import { useCallback, useEffect, useState } from 'react'

import { devError } from '@/lib/dev-log'

export const ORDER_EMAIL_TYPES = ['order_created', 'payment_confirmed'] as const
export type OrderEmailType = (typeof ORDER_EMAIL_TYPES)[number]

export interface EmailLog {
  id: string
  created_at: string
  status: string
  recipient: string
  subject: string
  metadata: {
    type?: string
  } | null
}

export function useOrderEmails(orderId: string | undefined) {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEmails = useCallback(() => {
    if (!orderId) {
      setEmailLogs([])
      return
    }

    setIsLoading(true)
    setError(null)

    fetch(`/api/admin/email-logs?orderId=${encodeURIComponent(orderId)}&pageSize=96`, {
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Erro ao buscar emails')
        }
        const data = (await response.json()) as { emailLogs?: EmailLog[] }
        setEmailLogs(data.emailLogs || [])
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        devError('Erro ao buscar emails:', err)
        setError(err instanceof Error ? err : new Error('Erro ao buscar emails'))
        setIsLoading(false)
      })
  }, [orderId])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  return { emailLogs, isLoading, error, refetch: fetchEmails }
}
