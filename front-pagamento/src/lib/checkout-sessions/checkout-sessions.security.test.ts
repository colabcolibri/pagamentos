import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as getSession } from '@/app/api/checkout/sessions/[token]/route'
import { GET as getProfile } from '@/app/api/profile/route'
import { POST as createSessionRoute } from '@/app/api/v1/checkout/sessions/route'

import { hashCheckoutSecret } from './api-keys'
import { resolveAndLockCheckoutSession } from './session-checkout'
import { completeCheckoutSessionForOrder, signOutboundWebhookPayload } from './webhook-complete'

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

vi.mock('@/lib/auth/session', () => ({
  findActiveSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'quitou_token' ? { value: 'checkout-session-token-must-not-auth' } : undefined,
  }),
}))

describe('Checkout Sessions Security Suite (US-0056)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))
  })

  it('POST /api/v1/checkout/sessions rejeita ausência, chave inválida ou revogada com 401', async () => {
    const resMissing = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        body: JSON.stringify({ productSlug: 'addon-x', pricingMode: 'custom', amountCents: 1500 }),
      })
    )
    expect(resMissing.status).toBe(401)

    mockQuery.mockResolvedValueOnce({ rows: [] })
    const resInvalid = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': 'qtk_invalid_or_revoked' },
        body: JSON.stringify({ productSlug: 'addon-x', pricingMode: 'custom', amountCents: 1500 }),
      })
    )
    expect(resInvalid.status).toBe(401)
  })

  it('POST /api/v1/checkout/sessions retorna 403 se produto não está em allowed_product_ids', async () => {
    const rawKey = 'qtk_valid_scoped_key'
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            label: 'External App',
            key_hash: hashCheckoutSecret(rawKey),
            allowed_product_ids: ['prod-allowed-only'],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // last_used_at
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'prod-other',
            ref: 'other-product',
            active: true,
            allow_custom_amount: true,
            min_amount_cents: 100,
            max_amount_cents: 50000,
          },
        ],
      })

    const res = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({
          productSlug: 'other-product',
          pricingMode: 'custom',
          amountCents: 1500,
        }),
      })
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/v1/checkout/sessions valida allow_custom_amount, limites min/max e URLs seguras', async () => {
    const rawKey = 'qtk_valid_key'
    const mockAuth = () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'key-1',
              label: 'External App',
              key_hash: hashCheckoutSecret(rawKey),
              allowed_product_ids: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
    }

    // Produto com allow_custom_amount = false -> 422
    mockAuth()
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'p1',
          ref: 'fixed-prod',
          active: true,
          allow_custom_amount: false,
          min_amount_cents: 100,
          max_amount_cents: null,
        },
      ],
    })
    const resDisabled = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({
          productSlug: 'fixed-prod',
          pricingMode: 'custom',
          amountCents: 500,
        }),
      })
    )
    expect(resDisabled.status).toBe(422)

    // amountCents fora de [min, max] -> 422
    mockAuth()
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'p2',
          ref: 'flex-prod',
          active: true,
          allow_custom_amount: true,
          min_amount_cents: 1000,
          max_amount_cents: 20000,
        },
      ],
    })
    const resOutOfBounds = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({ productSlug: 'flex-prod', pricingMode: 'custom', amountCents: 500 }),
      })
    )
    expect(resOutOfBounds.status).toBe(422)

    // successUrl com javascript: ou IP privado -> 400
    mockAuth()
    const resBadUrl = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': rawKey },
        body: JSON.stringify({
          productSlug: 'flex-prod',
          pricingMode: 'custom',
          amountCents: 1500,
          successUrl: 'https://192.168.0.10/callback',
        }),
      })
    )
    expect(resBadUrl.status).toBe(400)
  })

  it('POST /api/v1/checkout/sessions respeita Idempotency-Key sem duplicar sessão', async () => {
    const rawKey = 'qtk_idem_key'
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'key-1',
            label: 'External App',
            key_hash: hashCheckoutSecret(rawKey),
            allowed_product_ids: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'p2',
            ref: 'flex-prod',
            active: true,
            allow_custom_amount: true,
            min_amount_cents: 100,
            max_amount_cents: 50000,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-existing',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            pricing_mode: 'custom',
            amount_cents: 4200,
          },
        ],
      })

    const res = await createSessionRoute(
      new Request('http://localhost/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'x-api-key': rawKey, 'Idempotency-Key': 'idem-123' },
        body: JSON.stringify({
          productSlug: 'flex-prod',
          pricingMode: 'custom',
          amountCents: 4200,
        }),
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessionId: string; reused: boolean }
    expect(body.sessionId).toBe('sess-existing')
    expect(body.reused).toBe(true)
  })

  it('GET /api/checkout/sessions/[token] retorna 404, 410 e nunca vaza CPF, token_hash ou metadata', async () => {
    // 404
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res404 = await getSession(
      new Request('http://localhost/api/checkout/sessions/missing-token-123456'),
      { params: Promise.resolve({ token: 'missing-token-123456' }) }
    )
    expect(res404.status).toBe(404)

    // 410 completed
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'sess-1',
          pricing_mode: 'custom',
          amount_cents: 2500,
          status: 'completed',
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          product_id: 'p1',
          product_name: 'Add-on',
          product_ref: 'addon',
          product_active: true,
        },
      ],
    })
    const res410 = await getSession(
      new Request('http://localhost/api/checkout/sessions/completed-token-123456'),
      { params: Promise.resolve({ token: 'completed-token-123456' }) }
    )
    expect(res410.status).toBe(410)

    // 200 sem PII sensível
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-2',
            pricing_mode: 'custom',
            amount_cents: 2500,
            price_id: null,
            customer_email: 'buyer@example.com',
            customer_name: 'Buyer',
            email_verified_by_origin: true,
            success_url: null,
            cancel_url: null,
            status: 'open',
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            product_id: 'p1',
            product_name: 'Add-on',
            product_ref: 'addon',
            product_description: 'Desc',
            product_active: true,
            product_payment_methods: ['pix'],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ has_cpf: true }] })

    const res200 = await getSession(
      new Request('http://localhost/api/checkout/sessions/valid-token-123456'),
      { params: Promise.resolve({ token: 'valid-token-123456' }) }
    )
    expect(res200.status).toBe(200)
    expect(res200.headers.get('Cache-Control')).toBe('no-store')
    expect(res200.headers.get('Referrer-Policy')).toBe('no-referrer')
    const json = (await res200.json()) as Record<string, unknown>
    expect(json.requiresCpf).toBe(false)
    expect(json).not.toHaveProperty('cpf')
    expect(json).not.toHaveProperty('token_hash')
    expect(json).not.toHaveProperty('api_key_id')
    expect(json).not.toHaveProperty('metadata')
  })

  it('resolveAndLockCheckoutSession trava valor/metadata no servidor e não sobrescreve CPF existente', async () => {
    mockClientQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-lock',
            product_id: 'p1',
            price_id: null,
            pricing_mode: 'custom',
            amount_cents: 8900,
            customer_email: 'buyer@example.com',
            customer_name: 'Buyer',
            email_verified_by_origin: true,
            metadata: { userId: 'ext-user-1', targetExpiresAt: '2027-08-15T23:59:59Z' },
            success_url: null,
            status: 'open',
            order_id: null,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            product_name: 'Add-on',
            product_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'prof-1', name: 'Buyer', document: '11122233344', company_document: null }],
      })
      .mockResolvedValueOnce({ rows: [] }) // INSERT orders
      .mockResolvedValueOnce({ rows: [] }) // UPDATE checkout_sessions

    const resolved = await resolveAndLockCheckoutSession({
      checkoutSessionToken: 'valid-token-123456',
      // Tentativa de adulteração ignorada pelo servidor
      amountCents: 1,
      customer_info: {
        email: 'buyer@example.com',
        cpf: '99988877766',
      },
    } as Parameters<typeof resolveAndLockCheckoutSession>[0])

    expect(resolved.amountCents).toBe(8900)
    expect(resolved.customerDocument).toBe('11122233344')
    expect(resolved.metadata).toMatchObject({
      userId: 'ext-user-1',
      checkoutSessionId: 'sess-lock',
    })
  })

  it('token de checkout session NÃO autentica GET /api/profile (401)', async () => {
    const res = await getProfile(new Request('http://localhost/api/profile'))
    expect(res.status).toBe(401)
  })

  it('completeCheckoutSessionForOrder fecha sessão atomicamente e envia webhook HMAC-SHA256', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sess-99',
            pricing_mode: 'custom',
            price_id: null,
            amount_cents: 4500,
            metadata: { externalRef: 'sub-99' },
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'order-99',
            amount_cents: 4500,
            paid_at: '2026-11-19T00:00:00.000Z',
            payment_method: 'PIX',
            payment_gateway: 'pagarme',
            metadata: { externalRef: 'sub-99' },
            user_email: 'buyer@example.com',
            user_name: 'Buyer',
            product_id: 'prod-1',
            product_ref: 'addon-1',
            product_name: 'Add-on',
            webhook_url: 'https://partner.example.com/webhooks/quitou',
            webhook_secret: 'whsec_test_123',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'del-99', status: 'pending', attempts: 0 }] })
      .mockResolvedValueOnce({ rows: [] })

    const result = await completeCheckoutSessionForOrder('order-99')
    expect(result.closedSessionId).toBe('sess-99')
    expect(result.customWebhookSent).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = String(init.body)
    const headers = init.headers as Record<string, string>
    expect(headers['X-Quitou-Signature']).toBe(
      `sha256=${signOutboundWebhookPayload(body, 'whsec_test_123')}`
    )
    expect(JSON.parse(body)).toMatchObject({
      event: 'payment.confirmed',
      checkoutSessionId: 'sess-99',
      amountCents: 4500,
      metadata: { externalRef: 'sub-99' },
    })
  })
})
