import crypto from 'node:crypto'

import { getPool } from '@/lib/db/pool'

import type { CheckoutApiKeyPublic } from './types'

const KEY_PREFIX = 'qtk_'

export function hashCheckoutSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex')
}

function mapApiKeyRow(row: {
  id: string
  label: string
  key_prefix: string
  allowed_product_ids: string[] | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}): CheckoutApiKeyPublic {
  return {
    id: row.id,
    label: row.label,
    keyPrefix: row.key_prefix,
    allowedProductIds: row.allowed_product_ids ?? null,
    revokedAt: row.revoked_at ?? null,
    lastUsedAt: row.last_used_at ?? null,
    createdAt: row.created_at,
  }
}

export async function listCheckoutApiKeys(): Promise<CheckoutApiKeyPublic[]> {
  const result = await getPool().query<{
    id: string
    label: string
    key_prefix: string
    allowed_product_ids: string[] | null
    revoked_at: string | null
    last_used_at: string | null
    created_at: string
  }>(
    `SELECT id, label, key_prefix, allowed_product_ids, revoked_at, last_used_at, created_at
     FROM payments.checkout_api_keys
     ORDER BY created_at DESC`
  )
  return result.rows.map(mapApiKeyRow)
}

export async function createCheckoutApiKey(input: {
  label: string
  allowedProductIds?: string[] | null
  actorId: string
}): Promise<{ key: CheckoutApiKeyPublic; secret: string }> {
  const rawSecret = `${KEY_PREFIX}${crypto.randomBytes(32).toString('base64url')}`
  const keyPrefix = rawSecret.slice(0, 12)
  const keyHash = hashCheckoutSecret(rawSecret)
  const allowedProductIds =
    input.allowedProductIds && input.allowedProductIds.length > 0 ? input.allowedProductIds : null

  const pool = getPool()
  const inserted = await pool.query<{
    id: string
    label: string
    key_prefix: string
    allowed_product_ids: string[] | null
    revoked_at: string | null
    last_used_at: string | null
    created_at: string
  }>(
    `INSERT INTO payments.checkout_api_keys (label, key_prefix, key_hash, allowed_product_ids)
     VALUES ($1, $2, $3, $4::uuid[])
     RETURNING id, label, key_prefix, allowed_product_ids, revoked_at, last_used_at, created_at`,
    [input.label, keyPrefix, keyHash, allowedProductIds]
  )

  const row = inserted.rows[0]!
  await pool
    .query(
      `INSERT INTO payments.admin_audit_events (actor_id, action, target_type, target_id, detail)
       VALUES ($1, 'checkout_api_key.create', 'checkout_api_key', $2, $3::jsonb)`,
      [input.actorId, row.id, JSON.stringify({ label: row.label, keyPrefix })]
    )
    .catch(() => {})

  return {
    key: mapApiKeyRow(row),
    secret: rawSecret,
  }
}

export async function revokeCheckoutApiKey(input: {
  id: string
  actorId: string
}): Promise<CheckoutApiKeyPublic | null> {
  const pool = getPool()
  const updated = await pool.query<{
    id: string
    label: string
    key_prefix: string
    allowed_product_ids: string[] | null
    revoked_at: string | null
    last_used_at: string | null
    created_at: string
  }>(
    `UPDATE payments.checkout_api_keys
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE id = $1
     RETURNING id, label, key_prefix, allowed_product_ids, revoked_at, last_used_at, created_at`,
    [input.id]
  )

  const row = updated.rows[0]
  if (!row) return null

  await pool
    .query(
      `INSERT INTO payments.admin_audit_events (actor_id, action, target_type, target_id, detail)
       VALUES ($1, 'checkout_api_key.revoke', 'checkout_api_key', $2, $3::jsonb)`,
      [input.actorId, row.id, JSON.stringify({ label: row.label, keyPrefix: row.key_prefix })]
    )
    .catch(() => {})

  return mapApiKeyRow(row)
}
