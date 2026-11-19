import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as postDirectCheckout } from '@/app/api/v1/checkout/direct/route'
import { GET as getMirrorProduct } from '@/app/api/v1/checkout/products/[slug]/route'
import { GET as getS2sSse } from '@/app/api/v1/checkout/sessions/[id]/events/route'

import { hashCheckoutSecret } from './api-keys'
import { createSessionStatusSseStream } from './status-stream'
import { assertAndLockCatalogPriceStock } from './stock-reservation'
import { signOutboundWebhookPayload } from './webhook-complete'
import { recordAndDeliverWebhook, retryWebhookDeliveryById } from './webhook-deliveries'

const { mockQuery, mockClientQuery, mockWithTransaction } = vi.hoisted(() => {
  const mockQuery = vi.fn()
  const mockClientQuery = vi.fn()
  const mockWithTransaction = vi.fn(
    async (fn: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
      fn({ query: mockClientQuery })
  )
  return { mockQuery, mockClientQuery, mockWithTransaction }
})

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query: mockQuery }),
  withTransaction: mockWithTransaction,
}))

vi.mock('@/lib/security/secret-box', () => ({
  decryptStoredSecret: (v: string | null) => v,
}))

vi.mock('@/lib/payments/gateway-config', () => ({
  loadGatewayConfig: vi.fn().mockResolvedValue({
    pagarmeSecretKey: 'sk_test_pagarme',
    pagarmeEnvironment: 'sandbox',
  }),
}))

vi.mock('@quitou/core', () => ({
  createPagarmeService: () => ({
    createPaymentLink: vi.fn().mockResolvedValue({
      id: 'pl_test_123',
      url: 'https://pagarme.example.com/pay/pl_test_123',
    }),
  }),
}))

describe('Direct Checkout, Webhook Deliveries & SSE (US-0062)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/v1/checkout/direct exige API key (401) e endereço no BOLETO (400)', async () => {
    const res401 = await postDirectCheckout(
      new Request('http://localhost/api/v1/checkout/direct', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    expect(res401.status).toBe(401)

    const rawKey = 'qtk_direct_test'
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'key-1',
          label: 'App Externo',
          key_hash: hashCheckoutSecret(rawKey),
          allowed_product_ids: null,
        },
      ],
    })
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res400 = await postDirectCheckout(
      new Request('http://localhost/api/v1/checkout/direct', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({
          productSlug: 'addon-1',
          pricingMode: 'custom',
          amountCents: 2500,
          billingType: 'BOLETO',
          customer: { email: 'buyer@example.com', document: '12345678909' },
        }),
      })
    )
    expect(res400.status).toBe(400)
  })

  it('POST /api/v1/checkout/direct cria cobrança, retorna paymentUrl e zero PII', async () => {
    const rawKey = 'qtk_direct_ok'
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            label: 'App Externo',
            key_hash: hashCheckoutSecret(rawKey),
            allowed_product_ids: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // last_used_at
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'prod-1',
            name: 'Plano Flex',
            ref: 'plano-flex',
            active: true,
            allow_custom_amount: true,
            min_amount_cents: 100,
            max_amount_cents: 50000,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // INSERT pagarme_payments

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // SELECT profile
      .mockResolvedValueOnce({ rows: [{ id: 'prof-new' }] }) // INSERT profile
      .mockResolvedValueOnce({ rows: [] }) // INSERT orders
      .mockResolvedValueOnce({ rows: [] }) // INSERT checkout_sessions

    const res = await postDirectCheckout(
      new Request('http://localhost/api/v1/checkout/direct', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({
          productSlug: 'plano-flex',
          pricingMode: 'custom',
          amountCents: 4990,
          billingType: 'PIX',
          customer: {
            email: 'buyer@example.com',
            name: 'Comprador Teste',
            document: '12345678909',
            emailVerifiedByOrigin: true,
          },
          metadata: { externalUserId: 'usr-1' },
        }),
      })
    )

    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.paymentUrl).toBe('https://pagarme.example.com/pay/pl_test_123')
    expect(body.amountCents).toBe(4990)
    expect(body).not.toHaveProperty('cpf')
    expect(body).not.toHaveProperty('cnpj')
    expect(body).not.toHaveProperty('document')
    expect(body).not.toHaveProperty('address')
    expect(body).not.toHaveProperty('email')
  })

  it('recordAndDeliverWebhook registra falha e retryWebhookDeliveryById reenvia com HMAC mantendo event_id', async () => {
    const fetchFail = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }))
    vi.stubGlobal('fetch', fetchFail)

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'del-1', status: 'pending', attempts: 0 }] })
      .mockResolvedValueOnce({ rows: [] })

    const failed = await recordAndDeliverWebhook({
      eventId: 'evt_1',
      checkoutSessionId: 'sess-1',
      orderId: 'ord-1',
      productId: 'prod-1',
      targetUrl: 'https://partner.example.com/hook',
      payload: { event: 'payment.confirmed', eventId: 'evt_1', amountCents: 4990 },
      secret: 'whsec_123',
    })
    expect(failed.delivered).toBe(false)

    const fetchOk = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchOk)
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'del-1',
            event_id: 'evt_1',
            target_url: 'https://partner.example.com/hook',
            attempts: 1,
            payload: { event: 'payment.confirmed', eventId: 'evt_1', amountCents: 4990 },
            webhook_secret: 'whsec_123',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const retried = await retryWebhookDeliveryById('del-1')
    expect(retried.delivered).toBe(true)
    const [, init] = fetchOk.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['X-Quitou-Event-Id']).toBe('evt_1')
    expect(headers['X-Quitou-Signature']).toBe(
      `sha256=${signOutboundWebhookPayload(String(init.body), 'whsec_123')}`
    )
  })

  it('SSE exige API key na rota S2S e emite evento paid sem PII encerrando em completed', async () => {
    const res401 = await getS2sSse(
      new Request(
        'http://localhost/api/v1/checkout/sessions/550e8400-e29b-41d4-a716-446655440000/events'
      ),
      { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }) }
    )
    expect(res401.status).toBe(401)

    const ac = new AbortController()
    const stream = createSessionStatusSseStream({
      loadStatus: async () => ({
        status: 'completed',
        paid: true,
        amountCents: 4990,
        completedAt: '2026-11-19T11:30:00.000Z',
        successUrl: 'https://partner.example.com/ok',
      }),
      signal: ac.signal,
      intervalMs: 50,
      maxDurationMs: 500,
    })

    const reader = stream.getReader()
    const chunk = await reader.read()
    const text = new TextDecoder().decode(chunk.value)
    expect(text).toContain('event: status')
    expect(text).toContain('"paid":true')
    expect(text).not.toContain('cpf')
    expect(text).not.toContain('email')
    const done = await reader.read()
    expect(done.done).toBe(true)
  })

  it('assertAndLockCatalogPriceStock bloqueia com 409 quando stock_sold + stock_reserved >= stock_cap', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'price-1',
            product_id: 'prod-1',
            amount: 9900,
            active: true,
            stock_cap: 10,
            stock_sold: 8,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ reserved_count: '2' }] })

    await expect(
      assertAndLockCatalogPriceStock(
        { query: mockClientQuery } as unknown as Parameters<
          typeof assertAndLockCatalogPriceStock
        >[0],
        { priceId: 'price-1', expectedProductId: 'prod-1' }
      )
    ).rejects.toMatchObject({ status: 409 })
  })

  it('GET /api/v1/checkout/products/[slug] exige API key (401)', async () => {
    const res401 = await getMirrorProduct(
      new Request('http://localhost/api/v1/checkout/products/curso-teste'),
      { params: Promise.resolve({ slug: 'curso-teste' }) }
    )
    expect(res401.status).toBe(401)
  })
})
