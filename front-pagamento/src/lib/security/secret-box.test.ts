import { afterEach, describe, expect, it, vi } from 'vitest'

import { decryptStoredSecret, encryptStoredSecret } from './secret-box'

describe('secret-box', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('criptografa e descriptografa com chave configurada', () => {
    const encrypted = encryptStoredSecret('sk_test_123456', 'my-secret-key')
    expect(encrypted).toMatch(/^enc:v1:/)
    expect(decryptStoredSecret(encrypted, 'my-secret-key')).toBe('sk_test_123456')
    expect(decryptStoredSecret(encrypted, 'wrong-key')).toBeNull()
  })

  it('falha fechado em produção quando não há chave de criptografia', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SETTINGS_ENCRYPTION_KEY', '')
    vi.stubEnv('ACCESS_CODE_SECRET', '')

    expect(() => encryptStoredSecret('sk_live_secret')).toThrow(/obrigatório em produção/i)
  })
})
