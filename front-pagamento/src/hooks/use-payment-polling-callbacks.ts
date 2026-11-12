/**
 * Lógica pura de callbacks para usePaymentPolling.
 * Extraída para permitir testes unitários.
 */

export interface PaymentInfoForCallbacks {
  status: string
  payment_method?: string | null
  boleto_url?: string | null
  pix_qr_code?: string | null
  pix_code?: string | null
}

export interface PaymentPollingCallbacks {
  onSuccess?: () => void
  onBoletoGenerated?: (url: string) => void
  onPixGenerated?: (data: { qrCodeUrl: string; pixCode: string | null }) => void
}

export interface PaymentPollingRefs {
  hasCalledSuccess: { current: boolean }
  hasCalledBoleto: { current: boolean }
  hasCalledPix: { current: boolean }
}

/**
 * Determina quais callbacks devem ser chamados dado o paymentInfo atual.
 * Retorna objeto com callbacks a executar (para evitar efeitos colaterais durante o teste).
 */
export function getCallbacksToInvoke(
  paymentInfo: PaymentInfoForCallbacks,
  gateway: 'pagarme' | 'asaas',
  refs: PaymentPollingRefs
): {
  onSuccess?: boolean
  onBoletoGenerated?: string
  onPixGenerated?: { qrCodeUrl: string; pixCode: string | null }
} {
  const result: {
    onSuccess?: boolean
    onBoletoGenerated?: string
    onPixGenerated?: { qrCodeUrl: string; pixCode: string | null }
  } = {}

  if (gateway === 'asaas' && paymentInfo.boleto_url && !refs.hasCalledBoleto.current) {
    result.onBoletoGenerated = paymentInfo.boleto_url
    return result
  }

  if (gateway === 'asaas' && paymentInfo.pix_qr_code && !refs.hasCalledPix.current) {
    result.onPixGenerated = {
      qrCodeUrl: paymentInfo.pix_qr_code,
      pixCode: paymentInfo.pix_code || null,
    }
    return result
  }

  switch (paymentInfo.status) {
    case 'boleto_generated':
      if (!refs.hasCalledBoleto.current && paymentInfo.boleto_url) {
        result.onBoletoGenerated = paymentInfo.boleto_url
      }
      break

    case 'pix_generated':
      if (!refs.hasCalledPix.current && paymentInfo.pix_qr_code) {
        result.onPixGenerated = {
          qrCodeUrl: paymentInfo.pix_qr_code,
          pixCode: paymentInfo.pix_code || null,
        }
      }
      break

    case 'paid':
    case 'approved':
      if (!refs.hasCalledSuccess.current) {
        result.onSuccess = true
      }
      break
  }

  return result
}
