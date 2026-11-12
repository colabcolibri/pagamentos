import { describe, expect, it } from 'vitest'

import { isBlockedWebhookAddress, isPublicHttpsWebhookUrl } from './public-webhook-url'

describe('isPublicHttpsWebhookUrl', () => {
  it('recusa http, loopback e IP privado', async () => {
    expect(await isPublicHttpsWebhookUrl('http://example.com/hook')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://127.0.0.1/hook')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://10.1.1.1/hook')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://192.168.0.8/hook')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://172.16.5.5/hook')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://169.254.169.254/latest')).toBe(false)
    expect(await isPublicHttpsWebhookUrl('https://localhost/hook')).toBe(false)
  })

  it('aceita https cujo DNS só devolve endereço público', async () => {
    const ok = await isPublicHttpsWebhookUrl('https://hooks.example.com/pay', async () => ['8.8.8.8'])
    expect(ok).toBe(true)
  })

  it('recusa hostname que resolve para rede interna', async () => {
    const blocked = await isPublicHttpsWebhookUrl('https://hooks.example.com/pay', async () => [
      '8.8.8.8',
      '10.0.0.4',
    ])
    expect(blocked).toBe(false)
  })
})

describe('isBlockedWebhookAddress', () => {
  it('marca link-local e loopback', () => {
    expect(isBlockedWebhookAddress('127.0.0.1')).toBe(true)
    expect(isBlockedWebhookAddress('::1')).toBe(true)
    expect(isBlockedWebhookAddress('8.8.4.4')).toBe(false)
  })
})
