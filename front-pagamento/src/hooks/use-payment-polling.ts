'use client'

import { useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { devLog } from '@/lib/dev-log'

import {
  type PaymentInfoForCallbacks,
  type PaymentPollingRefs,
  getCallbacksToInvoke,
} from './use-payment-polling-callbacks'

interface PaymentPollingOptions {
  paymentId: string | null
  enabled: boolean
  gateway: 'pagarme' | 'asaas'
  onSuccess?: () => void
  onError?: () => void
  onBoletoGenerated?: (url: string) => void
  onPixGenerated?: (data: { qrCodeUrl: string; pixCode: string | null }) => void
}

interface PaymentInfo {
  status: string
  payment_method?: string | null
  billing_type?: string | null
  payment_link_url?: string | null
  boleto_url?: string | null
  boleto_line?: string | null
  boleto_barcode?: string | null
  pix_qr_code?: string | null
  pix_code?: string | null
}

const POLL_INTERVAL_MS = 5000
const TERMINAL_PAYMENT_STATUSES = new Set([
  'paid',
  'approved',
  'failed',
  'cancelled',
  'canceled',
  'refunded',
  'expired',
])

export function usePaymentPolling({
  paymentId,
  enabled,
  gateway,
  onSuccess,
  onBoletoGenerated,
  onPixGenerated,
}: PaymentPollingOptions) {
  const hasCalledSuccess = useRef(false)
  const hasCalledBoleto = useRef(false)
  const hasCalledPix = useRef(false)
  const [manuallyStopped, setManuallyStopped] = useState(false)

  // Reset refs quando paymentId muda
  useEffect(() => {
    hasCalledSuccess.current = false
    hasCalledBoleto.current = false
    hasCalledPix.current = false
    setManuallyStopped(false)
  }, [paymentId])

  const { data: paymentInfo = null, isLoading } = useQuery({
    queryKey: ['payment-status', paymentId, gateway],
    queryFn: async () => {
      if (!paymentId) return null

      const response = await fetch(`/api/payments/${paymentId}/status?gateway=${gateway}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar status do pagamento')
      }

      const { payment } = await response.json()
      return (payment ?? null) as PaymentInfo | null
    },
    enabled: enabled && !!paymentId,
    retry: 2,
    staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (manuallyStopped || !enabled || !paymentId) return false
      const status = query.state.data?.status
      if (status && TERMINAL_PAYMENT_STATUSES.has(status)) return false
      return POLL_INTERVAL_MS
    },
  })

  // Processar mudanças de status e executar callbacks
  useEffect(() => {
    if (!paymentInfo) return

    const refs: PaymentPollingRefs = {
      hasCalledSuccess,
      hasCalledBoleto,
      hasCalledPix,
    }
    const callbacks = getCallbacksToInvoke(paymentInfo as PaymentInfoForCallbacks, gateway, refs)

    devLog('Realtime: processando status', paymentInfo.status, {
      hasCalledSuccess: hasCalledSuccess.current,
      hasCalledBoleto: hasCalledBoleto.current,
      hasCalledPix: hasCalledPix.current,
    })

    if (callbacks.onBoletoGenerated) {
      devLog('Realtime: chamando onBoletoGenerated')
      hasCalledBoleto.current = true
      onBoletoGenerated?.(callbacks.onBoletoGenerated)
      return
    }
    if (callbacks.onPixGenerated) {
      devLog('Realtime: chamando onPixGenerated')
      hasCalledPix.current = true
      onPixGenerated?.(callbacks.onPixGenerated)
      return
    }
    if (callbacks.onSuccess) {
      devLog('Realtime: chamando onSuccess')
      hasCalledSuccess.current = true
      onSuccess?.()
    }
  }, [paymentInfo, gateway, onBoletoGenerated, onPixGenerated, onSuccess])

  return {
    paymentStatus: paymentInfo?.status || 'pending',
    paymentInfo,
    isLoading,
    stopPolling: () => {
      setManuallyStopped(true)
    },
  }
}
