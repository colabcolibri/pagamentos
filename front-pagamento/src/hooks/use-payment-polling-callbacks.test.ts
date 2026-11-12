import { describe, expect, it } from 'vitest'

import {
  type PaymentInfoForCallbacks,
  type PaymentPollingRefs,
  getCallbacksToInvoke,
} from './use-payment-polling-callbacks'

function createRefs(overrides?: Partial<PaymentPollingRefs>) {
  return {
    hasCalledSuccess: { current: false },
    hasCalledBoleto: { current: false },
    hasCalledPix: { current: false },
    ...overrides,
  }
}

describe('getCallbacksToInvoke', () => {
  it('retorna onSuccess quando status é paid e nunca chamou', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'paid',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onSuccess).toBe(true)
    expect(result.onBoletoGenerated).toBeUndefined()
    expect(result.onPixGenerated).toBeUndefined()
  })

  it('retorna onSuccess quando status é approved', () => {
    const paymentInfo: PaymentInfoForCallbacks = { status: 'approved' }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onSuccess).toBe(true)
  })

  it('não retorna onSuccess quando já chamou (idempotência)', () => {
    const paymentInfo: PaymentInfoForCallbacks = { status: 'paid' }
    const refs = createRefs({ hasCalledSuccess: { current: true } })

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onSuccess).toBeUndefined()
  })

  it('retorna onPixGenerated para Asaas quando pix_qr_code existe', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
      pix_qr_code: 'data:image/png;base64,abc',
      pix_code: '00020126...',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onPixGenerated).toEqual({
      qrCodeUrl: 'data:image/png;base64,abc',
      pixCode: '00020126...',
    })
    expect(result.onSuccess).toBeUndefined()
  })

  it('retorna onPixGenerated com pixCode null quando não informado', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
      pix_qr_code: 'data:image/png;base64,xyz',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onPixGenerated?.pixCode).toBeNull()
  })

  it('não retorna onPixGenerated quando já chamou', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
      pix_qr_code: 'data:image/png;base64,abc',
    }
    const refs = createRefs({ hasCalledPix: { current: true } })

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onPixGenerated).toBeUndefined()
  })

  it('retorna onBoletoGenerated para Asaas quando boleto_url existe', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
      boleto_url: 'https://www.asaas.com/b/pdf/123',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onBoletoGenerated).toBe('https://www.asaas.com/b/pdf/123')
  })

  it('prioriza boleto sobre PIX para Asaas (ordem de verificação)', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
      boleto_url: 'https://boleto.com/1',
      pix_qr_code: 'data:image/png;base64,x',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result.onBoletoGenerated).toBe('https://boleto.com/1')
    expect(result.onPixGenerated).toBeUndefined()
  })

  it('retorna onBoletoGenerated para status boleto_generated (Pagarme)', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'boleto_generated',
      boleto_url: 'https://pagarme.com/boleto/1',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'pagarme', refs)

    expect(result.onBoletoGenerated).toBe('https://pagarme.com/boleto/1')
  })

  it('retorna onPixGenerated para status pix_generated (Pagarme)', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pix_generated',
      pix_qr_code: 'data:image/png;base64,qr',
      pix_code: 'pix123',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'pagarme', refs)

    expect(result.onPixGenerated).toEqual({
      qrCodeUrl: 'data:image/png;base64,qr',
      pixCode: 'pix123',
    })
  })

  it('retorna objeto vazio para status pending sem boleto/PIX (Asaas)', () => {
    const paymentInfo: PaymentInfoForCallbacks = {
      status: 'pending',
    }
    const refs = createRefs()

    const result = getCallbacksToInvoke(paymentInfo, 'asaas', refs)

    expect(result).toEqual({})
  })
})
