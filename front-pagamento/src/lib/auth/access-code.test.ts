import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'

import { authAttemptAllowed, resetRateLimits } from '@/lib/security/api-rate-limit'

import {
  ACCESS_CODE_MAX_ATTEMPTS,
  ACCESS_CODE_TTL_MS,
  hashAccessCode,
  hashSecret,
  requestAccessCode,
  sessionCookieValue,
  verifyAccessCode,
} from './access-code'
import { LOGIN_CODE_NOTICE } from './login-notice'

const codeSecret = 'test-access-code-secret'

type Profile = { id: string; email: string }
type Code = {
  id: string
  profile_id: string
  code_hash: string
  expires_at: Date
  attempts: number
  consumed_at: Date | null
  created_at: Date
}

function memoryClient() {
  const profiles: Profile[] = []
  const codes: Code[] = []
  let seq = 0
  const nextId = () => `id-${++seq}`

  const client = {
    async query(sql: string, params: unknown[] = []) {
      const text = sql.replace(/\s+/g, ' ').trim()
      if (text.startsWith('SELECT id FROM payments.profiles')) {
        return { rows: profiles.filter((profile) => profile.email === params[0]) }
      }
      if (text.startsWith('UPDATE payments.profiles')) {
        throw new Error('perfil existente não pode ser alterado no pedido de código')
      }
      if (text.startsWith('INSERT INTO payments.profiles')) {
        const profile = { id: nextId(), email: String(params[0]) }
        profiles.push(profile)
        return { rows: [{ id: profile.id }] }
      }
      if (text.startsWith('DELETE FROM payments.access_codes')) {
        return { rows: [] }
      }
      if (text.includes('consumed_at IS NULL')) {
        for (const code of codes) {
          if (code.profile_id === params[0] && !code.consumed_at) code.consumed_at = new Date()
        }
        return { rows: [] }
      }
      if (text.startsWith('INSERT INTO payments.access_codes')) {
        codes.push({
          id: nextId(),
          profile_id: String(params[0]),
          code_hash: String(params[1]),
          expires_at: params[2] as Date,
          attempts: 0,
          consumed_at: null,
          created_at: new Date(),
        })
        return { rows: [] }
      }
      if (text.startsWith('SELECT id, code_hash')) {
        const rows = codes
          .filter((code) => code.profile_id === params[0])
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        return { rows: rows.slice(0, 1) }
      }
      if (text.includes('attempts = attempts + 1')) {
        const code = codes.find((item) => item.id === params[0])
        if (code) code.attempts += 1
        return { rows: [] }
      }
      if (text.startsWith('UPDATE payments.access_codes SET consumed_at')) {
        const code = codes.find((item) => item.id === params[0])
        if (code) code.consumed_at = new Date()
        return { rows: [] }
      }
      if (text.startsWith('INSERT INTO payments.sessions')) {
        return { rows: [] }
      }
      throw new Error(`SQL sem mapa: ${text}`)
    },
  }

  return { client: client as unknown as PoolClient, profiles }
}

describe('código de acesso', () => {
  it('pede código duas vezes e cria um perfil só', async () => {
    const { client, profiles } = memoryClient()
    const sent: string[] = []
    const send = vi.fn(async (_email: string, code: string) => {
      sent.push(code)
    })

    const first = await requestAccessCode(client, send, {
      email: 'Ana@Quitou.invalid',
      name: 'Ana',
      codeSecret,
    })
    const second = await requestAccessCode(client, send, {
      email: 'ana@quitou.invalid',
      name: 'Outra pessoa',
      phone: '11999999999',
      document: '123',
      codeSecret,
    })

    expect(first.userExists).toBe(false)
    expect(second.userExists).toBe(true)
    expect(first.message).toBe(LOGIN_CODE_NOTICE)
    expect(second.message).toBe(LOGIN_CODE_NOTICE)
    expect(JSON.stringify(second)).not.toContain('user_exists')
    expect(profiles).toHaveLength(1)
    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatch(/^\d{6}$/)
  })

  it('código expirado e código reusado não geram cookie de sessão', async () => {
    const { client } = memoryClient()
    let plain = ''
    await requestAccessCode(
      client,
      async (_email, code) => {
        plain = code
      },
      { email: 'ana@quitou.invalid', name: 'Ana', codeSecret }
    )

    const expired = await verifyAccessCode(client, {
      email: 'ana@quitou.invalid',
      code: plain,
      codeSecret,
      now: new Date(Date.now() + ACCESS_CODE_TTL_MS + 1000),
    })
    expect(sessionCookieValue(expired)).toBeNull()
    expect(expired.ok).toBe(false)

    const fresh = memoryClient()
    await requestAccessCode(
      fresh.client,
      async (_email, code) => {
        plain = code
      },
      { email: 'ana@quitou.invalid', name: 'Ana', codeSecret }
    )
    const first = await verifyAccessCode(fresh.client, {
      email: 'ana@quitou.invalid',
      code: plain,
      codeSecret,
    })
    const reused = await verifyAccessCode(fresh.client, {
      email: 'ana@quitou.invalid',
      code: plain,
      codeSecret,
    })

    expect(sessionCookieValue(first)).toMatch(/^[a-f0-9]{64}$/)
    expect(sessionCookieValue(reused)).toBeNull()
    expect(reused).toEqual({ ok: false, reason: 'reused' })
    expect(hashSecret(plain)).not.toBe(plain)
    expect(hashAccessCode(plain, codeSecret)).not.toBe(hashSecret(plain))
  })

  it('trava depois de cinco códigos errados', async () => {
    const { client } = memoryClient()
    let plain = ''
    await requestAccessCode(
      client,
      async (_email, code) => {
        plain = code
      },
      { email: 'ana@quitou.invalid', name: 'Ana', codeSecret }
    )
    for (let attempt = 0; attempt < ACCESS_CODE_MAX_ATTEMPTS; attempt += 1) {
      const wrong = await verifyAccessCode(client, {
        email: 'ana@quitou.invalid',
        code: '000000',
        codeSecret,
      })
      expect(wrong.ok).toBe(false)
    }
    const locked = await verifyAccessCode(client, {
      email: 'ana@quitou.invalid',
      code: plain,
      codeSecret,
    })
    expect(locked).toEqual({ ok: false, reason: 'attempts' })
  })

  it('e-mail ausente recebe o mesmo texto e o teto responde depois do limite', async () => {
    const { client } = memoryClient()
    const missing = await requestAccessCode(client, vi.fn(), {
      email: 'ninguem@quitou.invalid',
      createIfMissing: false,
      codeSecret,
    })
    expect(missing.message).toBe(LOGIN_CODE_NOTICE)
    expect(missing.emailSent).toBe(false)

    resetRateLimits()
    for (let i = 0; i < 5; i += 1) {
      expect(authAttemptAllowed('request', '203.0.113.8', 'ana@quitou.invalid')).toBe(true)
    }
    expect(authAttemptAllowed('request', '203.0.113.9', 'ana@quitou.invalid')).toBe(false)
  })
})
