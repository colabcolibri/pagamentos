import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { error } = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('../logger', () => ({
  getLogger: () => ({ error, info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

import {
  buildPaymentConfirmedWebhookSignature,
  sendPaymentConfirmedProductWebhook,
} from './payment-confirmed-product-webhook'

describe('buildPaymentConfirmedWebhookSignature', () => {
  it('gera header sha256= compatível com HMAC-SHA256 do body', () => {
    const secret = 'test-secret'
    const body = '{"event":"payment.confirmed"}'
    const sig = buildPaymentConfirmedWebhookSignature(secret, body)
    expect(sig.startsWith('sha256=')).toBe(true)
    const hex = sig.slice(7)
    const expected = createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    expect(hex).toBe(expected)
  })
})

describe('sendPaymentConfirmedProductWebhook', () => {
  beforeEach(() => {
    error.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('não chama URL privada e o log não leva o e-mail do comprador', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'order-1',
                status: 'paid',
                user_id: 'user-1',
                product_id: 'product-1',
                price_id: 'price-1',
                subscription_id: null,
                order_type: 'one_time',
                amount_cents: 1000,
                payment_method: 'pix',
                payment_gateway: 'asaas',
                paid_at: null,
                metadata: null,
                created_at: null,
                prices: {
                  id: 'price-1',
                  ref: 'avista',
                  amount: 1000,
                  currency: 'BRL',
                  recurring: false,
                  interval: null,
                  interval_count: null,
                  products: {
                    id: 'product-1',
                    ref: 'curso',
                    name: 'Curso',
                    webhook_url: 'https://10.1.1.1/hook',
                    webhook_secret: 'segredo',
                  },
                },
              },
              error: null,
            }),
          }),
        }),
      }),
    }

    await sendPaymentConfirmedProductWebhook(supabase, 'order-1')
    expect(fetch).not.toHaveBeenCalled()
    expect(JSON.stringify(error.mock.calls)).toContain('URL recusada')
    expect(JSON.stringify(error.mock.calls)).not.toContain('comprador@quitou.invalid')
  })
})
