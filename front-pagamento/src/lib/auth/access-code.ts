import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { PoolClient } from 'pg'

import { LOGIN_CODE_NOTICE } from './login-notice'

export const ACCESS_CODE_TTL_MS = 10 * 60 * 1000
export const ACCESS_CODE_MAX_ATTEMPTS = 5
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

export type AccessCodeRequestResult = {
  userExists: boolean
  emailSent: boolean
  message: string
  error?: Error
}

export type VerifyAccessCodeResult =
  | { ok: true; token: string; profileId: string; expiresAt: Date }
  | { ok: false; reason: 'expired' | 'reused' | 'attempts' | 'mismatch' | 'missing' }

type ProfileRow = { id: string }
type CodeRow = {
  id: string
  code_hash: string
  expires_at: Date
  attempts: number
  consumed_at: Date | null
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashAccessCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex')
}

function accessCodeMatches(stored: string, code: string, secret: string): boolean {
  const actual = Buffer.from(hashAccessCode(code, secret), 'hex')
  const expected = Buffer.from(stored, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function generateNumericCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function findOrCreateProfile(
  client: PoolClient,
  input: { email: string; name: string; phone?: string; document?: string }
): Promise<{ id: string; created: boolean }> {
  const existing = await client.query<ProfileRow>(
    'SELECT id FROM payments.profiles WHERE email = $1',
    [input.email]
  )
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, created: false }
  }

  const personType = input.document && input.document.length > 14 ? 'company' : 'individual'
  const inserted = await client.query<ProfileRow>(
    `INSERT INTO payments.profiles (email, name, phone, document, person_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.email,
      input.name || input.email.split('@')[0],
      input.phone ?? null,
      input.document ?? null,
      personType,
    ]
  )
  return { id: inserted.rows[0].id, created: true }
}

export async function requestAccessCode(
  client: PoolClient,
  sendCode: (email: string, code: string) => Promise<void>,
  input: {
    email: string
    name?: string
    phone?: string
    document?: string
    createIfMissing?: boolean
    codeSecret: string
  }
): Promise<AccessCodeRequestResult> {
  const email = normalizeEmail(input.email)
  const name = input.name?.trim() || ''
  if (!email || !email.includes('@')) {
    return {
      userExists: false,
      emailSent: false,
      message: 'E-mail ou nome inválido',
      error: new Error('E-mail ou nome inválido'),
    }
  }

  const existing = await client.query<ProfileRow>(
    'SELECT id FROM payments.profiles WHERE email = $1',
    [email]
  )
  if (!existing.rows[0] && input.createIfMissing === false) {
    return {
      userExists: false,
      emailSent: false,
      message: LOGIN_CODE_NOTICE,
    }
  }

  const profile = await findOrCreateProfile(client, {
    email,
    name,
    phone: input.phone,
    document: input.document,
  })
  const code = generateNumericCode()
  const codeHash = hashAccessCode(code, input.codeSecret)
  const expiresAt = new Date(Date.now() + ACCESS_CODE_TTL_MS)

  await client.query(
    `DELETE FROM payments.access_codes
     WHERE expires_at < now() - interval '1 day'`
  )
  await client.query(
    `UPDATE payments.access_codes
     SET consumed_at = now()
     WHERE profile_id = $1 AND consumed_at IS NULL`,
    [profile.id]
  )
  await client.query(
    `INSERT INTO payments.access_codes (profile_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [profile.id, codeHash, expiresAt]
  )
  await sendCode(email, code)

  return {
    userExists: !profile.created,
    emailSent: true,
    message: LOGIN_CODE_NOTICE,
  }
}

export async function verifyAccessCode(
  client: PoolClient,
  input: { email: string; code: string; now?: Date; codeSecret: string }
): Promise<VerifyAccessCodeResult> {
  const email = normalizeEmail(input.email)
  const now = input.now ?? new Date()
  const profile = await client.query<ProfileRow>(
    'SELECT id FROM payments.profiles WHERE email = $1',
    [email]
  )
  if (!profile.rows[0]) return { ok: false, reason: 'missing' }

  const code = await client.query<CodeRow>(
    `SELECT id, code_hash, expires_at, attempts, consumed_at
     FROM payments.access_codes
     WHERE profile_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [profile.rows[0].id]
  )
  const row = code.rows[0]
  if (!row) return { ok: false, reason: 'missing' }
  if (row.consumed_at) return { ok: false, reason: 'reused' }
  if (new Date(row.expires_at).getTime() <= now.getTime()) return { ok: false, reason: 'expired' }
  if (row.attempts >= ACCESS_CODE_MAX_ATTEMPTS) return { ok: false, reason: 'attempts' }
  if (!accessCodeMatches(row.code_hash, input.code.trim(), input.codeSecret)) {
    await client.query('UPDATE payments.access_codes SET attempts = attempts + 1 WHERE id = $1', [
      row.id,
    ])
    return { ok: false, reason: 'mismatch' }
  }

  await client.query('UPDATE payments.access_codes SET consumed_at = now() WHERE id = $1', [row.id])
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await client.query(
    `INSERT INTO payments.sessions (profile_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [profile.rows[0].id, hashSecret(token), expiresAt]
  )
  return { ok: true, token, profileId: profile.rows[0].id, expiresAt }
}

export function sessionCookieValue(result: VerifyAccessCodeResult): string | null {
  return result.ok ? result.token : null
}
