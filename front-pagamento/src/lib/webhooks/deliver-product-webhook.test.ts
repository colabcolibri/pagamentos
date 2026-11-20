import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deliverProductWebhookForOrder } from './deliver-product-webhook'

const { queryMock, recordAndDeliverWebhookMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  recordAndDeliverWebhookMock: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query: queryMock }),
}))

vi.mock('@/lib/checkout-sessions/webhook-deliveries', () => ({
  recordAndDeliverWebhook: recordAndDeliverWebhookMock,
}))

vi.mock('@/lib/security/secret-box', () => ({
  decryptStoredSecret: (v: string | null) => v,
}))

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const baseOrderRow = {
  id: '389b3806-1d92-4b0d-abd1-892514da4a5f',
  user_id: 'user-1',
  product_id: 'prod-1',
  price_id: 'price-1',
  subscription_id: null,
  order_type: 'one_time',
  status: 'paid',
  amount_cents: 79900,
  payment_method: 'pix',
  payment_gateway: 'pagarme',
  paid_at: '2026-11-20T19:48:30.091Z',
  metadata: null,
  created_at: '2026-11-20T19:41:32.006Z',
  user_email: 'mibardus@uol.com.br',
  user_name: 'MICHELLE BARDUS',
  product_ref: 'colibri-edu',
  product_name: 'Colibri Edu — Acesso Completo',
  webhook_url: 'https://edu.colabcolibri.com/api/hooks/subscription',
  webhook_secret: 'segredo-super-seguro',
  price_ref: 'colibri-edu-vitalicio',
  price_amount: 79900,
  price_currency: 'BRL',
  price_recurring: false,
  price_interval: null,
  price_interval_count: null,
}

describe('deliverProductWebhookForOrder', () => {
  beforeEach(() => {
    queryMock.mockReset()
    recordAndDeliverWebhookMock.mockReset()
  })

  it('recusa pedido que ainda não está pago', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...baseOrderRow, status: 'pending' }] })
    const res = await deliverProductWebhookForOrder(baseOrderRow.id)
    expect(res).toEqual({
      dispatched: false,
      delivered: false,
      reason: 'Pedido ainda não está pago',
    })
    expect(recordAndDeliverWebhookMock).not.toHaveBeenCalled()
  })

  it('registra tentativa em webhook_deliveries mesmo quando webhook_secret é null', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ ...baseOrderRow, webhook_secret: null }] })
    recordAndDeliverWebhookMock.mockResolvedValueOnce({ deliveryId: 'del-1', delivered: false })

    const res = await deliverProductWebhookForOrder(baseOrderRow.id)

    expect(recordAndDeliverWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: `evt_order_${baseOrderRow.id}`,
        orderId: baseOrderRow.id,
        targetUrl: baseOrderRow.webhook_url,
        secret: null,
      })
    )
    expect(res).toEqual({ dispatched: true, delivered: false, deliveryId: 'del-1' })
  })

  it('envia e retorna delivered=true quando configurado corretamente', async () => {
    queryMock.mockResolvedValueOnce({ rows: [baseOrderRow] })
    recordAndDeliverWebhookMock.mockResolvedValueOnce({ deliveryId: 'del-2', delivered: true })

    const res = await deliverProductWebhookForOrder(baseOrderRow.id)

    expect(recordAndDeliverWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: `evt_order_${baseOrderRow.id}`,
        secret: 'segredo-super-seguro',
      })
    )
    expect(res).toEqual({ dispatched: true, delivered: true, deliveryId: 'del-2' })
  })
})
