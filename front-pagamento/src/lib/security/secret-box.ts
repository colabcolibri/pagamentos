import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const SECRET_BOX_PREFIX = 'enc:v1:'
const IV_BYTE_LENGTH = 12
const AUTH_TAG_BYTE_LENGTH = 16

function resolveEncryptionKey(explicitKey?: string | null): Buffer | null {
  const raw =
    explicitKey?.trim() ||
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    process.env.ACCESS_CODE_SECRET?.trim() ||
    ''
  if (!raw) return null
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function encryptStoredSecret(
  value: string | null | undefined,
  explicitKey?: string | null
): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (trimmed.startsWith(SECRET_BOX_PREFIX)) return trimmed

  const key = resolveEncryptionKey(explicitKey)
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY ou ACCESS_CODE_SECRET é obrigatório em produção para criptografar segredos.'
      )
    }
    return trimmed
  }

  const iv = randomBytes(IV_BYTE_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  })
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${SECRET_BOX_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptStoredSecret(
  value: string | null | undefined,
  explicitKey?: string | null
): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (!trimmed.startsWith(SECRET_BOX_PREFIX)) return trimmed

  const key = resolveEncryptionKey(explicitKey)
  if (!key) return null

  const payload = trimmed.slice(SECRET_BOX_PREFIX.length)
  const parts = payload.split('.')
  if (parts.length !== 3) return null

  try {
    const iv = Buffer.from(parts[0], 'base64url')
    const tag = Buffer.from(parts[1], 'base64url')
    const ciphertext = Buffer.from(parts[2], 'base64url')
    if (iv.length !== IV_BYTE_LENGTH || tag.length !== AUTH_TAG_BYTE_LENGTH) {
      return null
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: AUTH_TAG_BYTE_LENGTH,
    })
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}
