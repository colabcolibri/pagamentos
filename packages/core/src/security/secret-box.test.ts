import { describe, expect, it } from 'vitest'

import { decryptStoredSecret, encryptStoredSecret } from './secret-box'

describe('secret-box (AES-256-GCM)', () => {
  const masterKey = 'chave-mestra-de-teste-com-entropia-alta'

  it('criptografa com prefixo enc:v1: e descriptografa de volta ao valor original', () => {
    const cipher = encryptStoredSecret('sk_live_segredo_super_critico', masterKey)
    expect(cipher).toBeTruthy()
    expect(cipher?.startsWith('enc:v1:')).toBe(true)
    expect(cipher).not.toContain('sk_live_')
    expect(decryptStoredSecret(cipher, masterKey)).toBe('sk_live_segredo_super_critico')
  })

  it('mantém compatibilidade com valores legados em texto puro no banco', () => {
    expect(decryptStoredSecret('valor_legado_sem_prefixo', masterKey)).toBe(
      'valor_legado_sem_prefixo'
    )
  })

  it('recusa ciphertext adulterado ou chave incorreta', () => {
    const cipher = encryptStoredSecret('segredo-webhook-123', masterKey)
    expect(decryptStoredSecret(cipher, 'outra-chave-errada')).toBeNull()
    expect(decryptStoredSecret(`${cipher}x`, masterKey)).toBeNull()
  })
})
