import { afterEach, describe, expect, it } from 'vitest'

import { allowRequest, clientAddress, resetRateLimits } from './api-rate-limit'

describe('clientAddress', () => {
  const previous = process.env.TRUSTED_PROXY

  afterEach(() => {
    if (previous === undefined) delete process.env.TRUSTED_PROXY
    else process.env.TRUSTED_PROXY = previous
  })

  it('ignora X-Forwarded-For quando o proxy não é confiável', () => {
    delete process.env.TRUSTED_PROXY
    const headers = { get: (name: string) => (name === 'x-forwarded-for' ? '1.2.3.4' : null) }
    expect(clientAddress(headers, '10.0.0.8')).toBe('10.0.0.8')
  })

  it('usa o primeiro X-Forwarded-For quando o proxy é confiável', () => {
    process.env.TRUSTED_PROXY = '1'
    const headers = {
      get: (name: string) => (name === 'x-forwarded-for' ? '1.2.3.4, 10.0.0.1' : null),
    }
    expect(clientAddress(headers, '10.0.0.8')).toBe('1.2.3.4')
  })
})

describe('allowRequest', () => {
  afterEach(() => {
    resetRateLimits()
  })

  it('libera até o teto e recusa o seguinte no mesmo balde', () => {
    expect(allowRequest('webhook', '1.1.1.1', 2, 60_000)).toBe(true)
    expect(allowRequest('webhook', '1.1.1.1', 2, 60_000)).toBe(true)
    expect(allowRequest('webhook', '1.1.1.1', 2, 60_000)).toBe(false)
    expect(allowRequest('webhook', '2.2.2.2', 2, 60_000)).toBe(true)
  })
})
