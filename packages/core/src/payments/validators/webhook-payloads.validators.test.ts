import { describe, it, expect } from 'vitest'
import {
  asaasWebhookPayloadSchema,
  pagarmeWebhookPayloadSchema,
} from './webhook-payloads.validators'

describe('asaasWebhookPayloadSchema', () => {
  it('aceita payload mínimo com event e payment.id', () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_123' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.event).toBe('PAYMENT_RECEIVED')
      expect(result.data.payment?.id).toBe('pay_123')
    }
  })

  it('aceita payload só com event (payment opcional)', () => {
    const payload = { event: 'PAYMENT_REFUNDED' }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.payment).toBeUndefined()
  })

  it('aceita payment com billingType', () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_456', billingType: 'PIX' },
    }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.payment?.billingType).toBe('PIX')
  })

  it('aceita payment com checkoutSession (Checkout API)', () => {
    const payload = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_xxx',
        billingType: 'PIX',
        checkoutSession: 'cs_abc123',
      },
    }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payment?.checkoutSession).toBe('cs_abc123')
    }
  })

  it('aceita payment com installment (parcelado)', () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_parcela_2',
        installment: 'b8dd74c-d078-40a0-9ae1-61a66c61a204',
        billingType: 'BOLETO',
      },
    }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payment?.installment).toBe(
        'b8dd74c-d078-40a0-9ae1-61a66c61a204'
      )
    }
  })

  it('rejeita event vazio', () => {
    const payload = { event: '', payment: { id: 'pay_123' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejeita payload sem event', () => {
    const payload = { payment: { id: 'pay_123' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejeita payment.id vazio quando payment existe', () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: '' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('aceita CHECKOUT_EXPIRED só com checkout.id', () => {
    const payload = { event: 'CHECKOUT_EXPIRED', checkout: { id: 'cs_abc123' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.checkout?.id).toBe('cs_abc123')
  })

  it('aceita CHECKOUT_CREATED só com checkout.id', () => {
    const payload = { event: 'CHECKOUT_CREATED', checkout: { id: 'cs_new' } }
    const result = asaasWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})

describe('pagarmeWebhookPayloadSchema', () => {
  it('aceita payload mínimo com type e data.id/code', () => {
    const payload = {
      type: 'order.paid',
      data: { id: 'order_123', code: 'link_abc' },
    }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('order.paid')
      expect(result.data.data?.id).toBe('order_123')
      expect(result.data.data?.code).toBe('link_abc')
    }
  })

  it('aceita payload só com type (data opcional)', () => {
    const payload = { type: 'charge.refunded' }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.data).toBeUndefined()
  })

  it('aceita data com charges', () => {
    const payload = {
      type: 'order.paid',
      data: {
        id: 'ord_1',
        code: 'code_1',
        charges: [{ payment_method: 'pix' }],
      },
    }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.data?.charges?.[0]?.payment_method).toBe('pix')
  })

  it('rejeita type vazio', () => {
    const payload = { type: '', data: { id: 'x', code: 'y' } }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejeita payload sem type', () => {
    const payload = { data: { id: 'order_123', code: 'link_abc' } }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejeita data.id vazio quando data existe', () => {
    const payload = { type: 'order.paid', data: { id: '', code: 'link_abc' } }
    const result = pagarmeWebhookPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})
