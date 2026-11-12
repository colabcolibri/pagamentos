import { NextRequest } from 'next/server'

import { afterEach, describe, expect, it } from 'vitest'

import { resetRateLimits } from '@/lib/security/api-rate-limit'

import { proxy } from '../proxy'

function post(path: string, email: string, forwardedFor: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': forwardedFor,
    },
    body: JSON.stringify({ email }),
  })
}

describe('proxy', () => {
  afterEach(() => {
    resetRateLimits()
    delete process.env.TRUSTED_PROXY
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'test'
  })

  it('estoura o webhook por IP e ignora X-Forwarded-For sem proxy confiável', async () => {
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'production'
    delete process.env.DISABLE_API_RATE_LIMIT
    let blocked = 0
    for (let i = 0; i < 61; i += 1) {
      const response = await proxy(
        post('/api/payments/pagarme/webhook', 'a@b.co', `203.0.113.${i}`)
      )
      if (response.status === 429) blocked += 1
    }
    expect(blocked).toBeGreaterThan(0)

    resetRateLimits()
    const asaas = await proxy(post('/api/payments/asaas/webhook', 'a@b.co', '198.51.100.9'))
    expect(asaas.status).not.toBe(429)
  })
})
