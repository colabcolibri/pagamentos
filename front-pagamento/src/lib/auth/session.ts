import { getPool } from '@/lib/db/pool'

import { hashSecret } from './access-code'

export type ActiveSession = {
  profileId: string
  email: string
  name?: string
  role?: string | null
  isAdmin: boolean
}

export async function findActiveSession(token: string | undefined): Promise<ActiveSession | null> {
  if (!token || !process.env.DATABASE_URL) return null

  const result = await getPool().query<{
    id: string
    email: string
    name: string | null
    is_active: boolean | null
    role: string | null
  }>(
    `SELECT p.id, p.email, p.name, au.is_active, au.role
     FROM payments.sessions s
     JOIN payments.profiles p ON p.id = s.profile_id
     LEFT JOIN payments.admin_users au ON au.id = p.id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [hashSecret(token)]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    profileId: row.id,
    email: row.email,
    name: row.name ?? '',
    role: row.role,
    isAdmin: row.is_active === true,
  }
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token || !process.env.DATABASE_URL) return
  const pool = getPool()
  await pool.query(
    `UPDATE payments.sessions
     SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashSecret(token)]
  )
  await pool.query(
    `DELETE FROM payments.sessions
     WHERE expires_at < now() - interval '7 days'`
  )
}
