import crypto from 'node:crypto'

import { ACCESS_CODE_MAX_ATTEMPTS, hashAccessCode } from '@/lib/auth/access-code'
import { getPool } from '@/lib/db/pool'
import { timingSafeStringEqual } from '@/lib/security/timing-safe-string-equal'

const PROOF_TTL_MS = 30 * 60_000

function getProofSecret(): string {
  return (
    process.env.CHECKOUT_SESSION_PROOF_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    'quitou-dev-checkout-proof-secret'
  )
}

export function signSessionEmailProof(sessionId: string, email: string): string {
  const normalized = email.trim().toLowerCase()
  const exp = Date.now() + PROOF_TTL_MS
  const payload = `${sessionId}|${normalized}|${exp}`
  const sig = crypto.createHmac('sha256', getProofSecret()).update(payload).digest('base64url')
  return `${exp}.${sig}`
}

export function verifySessionEmailProof(
  sessionId: string,
  email: string,
  proof: string | null | undefined
): boolean {
  if (!proof || !proof.includes('.')) return false
  const [expStr, sig] = proof.split('.', 2)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp <= Date.now() || !sig) return false
  const normalized = email.trim().toLowerCase()
  const payload = `${sessionId}|${normalized}|${exp}`
  const expected = crypto.createHmac('sha256', getProofSecret()).update(payload).digest('base64url')
  return timingSafeStringEqual(sig, expected)
}

export async function verifyAccessCodeForSessionEmail(input: {
  sessionId: string
  email: string
  code: string
}): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  const normalized = input.email.trim().toLowerCase()
  const trimmedCode = input.code.trim()
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { ok: false, error: 'Código deve ter 6 dígitos' }
  }

  const secret = getProofSecret()
  const accessSecret = process.env.ACCESS_CODE_SECRET || process.env.SESSION_SECRET || secret
  const pool = getPool()

  const res = await pool.query<{
    id: string
    code_hash: string
    expires_at: string
    attempts: number
    consumed_at: string | null
  }>(
    `SELECT id, code_hash, expires_at, attempts, consumed_at
     FROM payments.access_codes
     WHERE lower(email) = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalized]
  )

  const row = res.rows[0]
  if (!row) return { ok: false, error: 'Código não encontrado. Solicite um novo código.' }
  if (row.consumed_at) return { ok: false, error: 'Código já utilizado.' }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: 'Código expirado. Solicite um novo código.' }
  }
  if (row.attempts >= ACCESS_CODE_MAX_ATTEMPTS) {
    return { ok: false, error: 'Limite de tentativas excedido.' }
  }

  const candidate = hashAccessCode(trimmedCode, accessSecret)
  if (!timingSafeStringEqual(row.code_hash, candidate)) {
    await pool.query(`UPDATE payments.access_codes SET attempts = attempts + 1 WHERE id = $1`, [
      row.id,
    ])
    return { ok: false, error: 'Código inválido.' }
  }

  await pool.query(`UPDATE payments.access_codes SET consumed_at = now() WHERE id = $1`, [row.id])
  return { ok: true, proof: signSessionEmailProof(input.sessionId, normalized) }
}
