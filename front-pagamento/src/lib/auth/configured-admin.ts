import type { PoolClient } from 'pg'

import { serverEnv } from '@/lib/config/env'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function allowsProfileCreation(email: string, requested: boolean | undefined): boolean {
  const configured = serverEnv.ADMIN_EMAIL
  if (configured && normalizeEmail(email) === configured) return true
  return requested !== false
}

export async function ensureConfiguredAdmin(
  client: PoolClient,
  input: { profileId: string; email: string }
): Promise<boolean> {
  const configured = serverEnv.ADMIN_EMAIL
  if (!configured || normalizeEmail(input.email) !== configured) return false

  const updated = await client.query(
    `INSERT INTO payments.admin_users (id, email, name, role, is_active)
     SELECT id, email, COALESCE(NULLIF(btrim(name), ''), email), 'admin', true
     FROM payments.profiles
     WHERE id = $1 AND lower(email) = $2
     ON CONFLICT (id) DO UPDATE
     SET email = EXCLUDED.email,
         updated_at = now()
     WHERE payments.admin_users.is_active IS TRUE`,
    [input.profileId, configured]
  )
  return (updated.rowCount ?? 0) > 0
}
