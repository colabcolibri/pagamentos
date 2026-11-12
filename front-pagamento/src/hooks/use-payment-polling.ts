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
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: initialPaymentInfo } = useQuery({
    queryKey: ['payment-status-initial', paymentId, gateway],
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
      return payment as PaymentInfo
    },
    enabled: enabled && !!paymentId,
    retry: 2,
    staleTime: 0, // Sempre buscar status inicial
  })

  // Atualizar estado quando dados iniciais chegarem
  useEffect(() => {
    if (initialPaymentInfo) {
      setPaymentInfo(initialPaymentInfo)
      setIsLoading(false)
    }
  }, [initialPaymentInfo])

  // Reset refs quando paymentId muda
  useEffect(() => {
    hasCalledSuccess.current = false
    hasCalledBoleto.current = false
    hasCalledPix.current = false
    setPaymentInfo(null)
    setIsLoading(true)
  }, [paymentId])

  const POLL_INTERVAL_MS = 5000
  useEffect(() => {
    if (!enabled || !paymentId) return
    if (paymentInfo?.status === 'paid' || paymentInfo?.status === 'approved') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status?gateway=${gateway}`, {
          credentials: 'include',
        })
        if (!res.ok) return
        const { payment } = await res.json()
        if (payment && payment.status !== paymentInfo?.status) {
          devLog('Polling: Status atualizado', payment.status)
          setPaymentInfo(payment as PaymentInfo)
          setIsLoading(false)
        }
      } catch {
        // Ignorar erros de polling
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled, paymentId, gateway, paymentInfo?.status])

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
      devLog('Realtime: stopPolling chamado (não necessário com Realtime)')
    },
  }
}
