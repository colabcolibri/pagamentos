import { describe, it, expect } from 'vitest'
import { sanitizeHeaders } from './webhook-logger'

describe('sanitizeHeaders', () => {
  it('remove authorization', () => {
    const headers = { authorization: 'Bearer secret', 'content-type': 'application/json' }
    const out = sanitizeHeaders(headers)
    expect(out).not.toHaveProperty('authorization')
    expect(out['content-type']).toBe('application/json')
  })

  it('remove asaas-access-token', () => {
    const headers = { 'asaas-access-token': 'token123', 'user-agent': 'test' }
    const out = sanitizeHeaders(headers)
    expect(out).not.toHaveProperty('asaas-access-token')
    expect(out['user-agent']).toBe('test')
  })

  it('remove x-api-key e api-key', () => {
    const headers = { 'x-api-key': 'key', 'api-key': 'key2', 'x-request-id': 'req-1' }
    const out = sanitizeHeaders(headers)
    expect(out).not.toHaveProperty('x-api-key')
    expect(out).not.toHaveProperty('api-key')
    expect(out['x-request-id']).toBe('req-1')
  })

  it('remove cookie', () => {
    const headers = { cookie: 'session=abc', 'content-type': 'application/json' }
    const out = sanitizeHeaders(headers)
    expect(out).not.toHaveProperty('cookie')
    expect(out['content-type']).toBe('application/json')
  })

  it('remove headers que começam com x-auth-', () => {
    const headers = { 'x-auth-token': 't', 'x-auth-user': 'u', 'x-request-id': 'r' }
    const out = sanitizeHeaders(headers)
    expect(out).not.toHaveProperty('x-auth-token')
    expect(out).not.toHaveProperty('x-auth-user')
    expect(out['x-request-id']).toBe('r')
  })

  it('mantém headers úteis para auditoria', () => {
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'Asaas-Webhook/1.0',
      'x-request-id': 'req-123',
    }
    const out = sanitizeHeaders(headers)
    expect(out['content-type']).toBe('application/json')
    expect(out['user-agent']).toBe('Asaas-Webhook/1.0')
    expect(out['x-request-id']).toBe('req-123')
  })

  it('headers sensíveis não aparecem no objeto retornado', () => {
    const headers: Record<string, unknown> = {
      authorization: 'Bearer x',
      'asaas-access-token': 'y',
      'x-api-key': 'z',
      cookie: 'c=1',
      'content-type': 'application/json',
    }
    const out = sanitizeHeaders(headers)
    const keys = Object.keys(out).map((k) => k.toLowerCase())
    expect(keys).not.toContain('authorization')
    expect(keys).not.toContain('asaas-access-token')
    expect(keys).not.toContain('x-api-key')
    expect(keys).not.toContain('cookie')
    expect(keys).toContain('content-type')
  })
})
