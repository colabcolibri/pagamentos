import { randomBytes, randomUUID } from 'node:crypto'
import 'server-only'

import { hashSecret } from '@/lib/auth/access-code'
import { getPool } from '@/lib/db/pool'

import { verifyPkce } from './pkce'
import { isAllowedRedirectUri } from './redirect-uri'

const ACCESS_TTL_MS = 60 * 60 * 1000

function asUris(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') {
    try {
      return asUris(JSON.parse(value) as unknown)
    } catch {
      return []
    }
  }
  return []
}

export async function registerClient(redirectUris: string[]) {
  const uris = [...new Set(redirectUris.map((uri) => uri.trim()).filter(Boolean))]
  if (uris.length === 0 || uris.length > 5 || uris.some((uri) => !isAllowedRedirectUri(uri))) {
    return null
  }
  const id = randomUUID()
  await getPool().query(
    'INSERT INTO payments.mcp_clients (id, redirect_uris) VALUES ($1, $2::jsonb)',
    [id, JSON.stringify(uris)]
  )
  return { client_id: id, redirect_uris: uris }
}

export async function clientAllows(clientId: string, redirectUri: string) {
  const rows = await getPool().query<{ redirect_uris: unknown }>(
    'SELECT redirect_uris FROM payments.mcp_clients WHERE id = $1',
    [clientId]
  )
  return asUris(rows.rows[0]?.redirect_uris).includes(redirectUri)
}

export async function issueAuthCode(input: {
  clientId: string
  profileId: string
  redirectUri: string
  codeChallenge: string
}) {
  const code = randomBytes(32).toString('base64url')
  const pool = getPool()
  await pool.query(
    `DELETE FROM payments.mcp_auth_codes
     WHERE expires_at < now() - interval '1 hour'`
  )
  await pool.query(
    `INSERT INTO payments.mcp_auth_codes
       (code_hash, client_id, profile_id, redirect_uri, code_challenge, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '5 minutes')`,
    [hashSecret(code), input.clientId, input.profileId, input.redirectUri, input.codeChallenge]
  )
  return code
}

export async function exchangeCode(input: {
  code: string
  clientId: string
  redirectUri: string
  verifier: string
}) {
  const pool = getPool()
  const rows = await pool.query<{
    client_id: string
    profile_id: string
    redirect_uri: string
    code_challenge: string
    expires_at: Date
    used_at: Date | null
  }>(
    `SELECT client_id, profile_id, redirect_uri, code_challenge, expires_at, used_at
     FROM payments.mcp_auth_codes WHERE code_hash = $1`,
    [hashSecret(input.code)]
  )
  const row = rows.rows[0]
  if (!row || row.used_at || row.expires_at.getTime() < Date.now()) return null
  if (row.client_id !== input.clientId || row.redirect_uri !== input.redirectUri) return null
  if (!verifyPkce(input.verifier, row.code_challenge)) return null
  await pool.query('UPDATE payments.mcp_auth_codes SET used_at = now() WHERE code_hash = $1', [
    hashSecret(input.code),
  ])
  return issueTokenPair(row.profile_id, row.client_id)
}

async function issueTokenPair(profileId: string, clientId: string) {
  const access = randomBytes(32).toString('base64url')
  const refresh = randomBytes(32).toString('base64url')
  const pool = getPool()
  await pool.query(
    `INSERT INTO payments.mcp_tokens (token_hash, kind, profile_id, client_id, expires_at)
     VALUES ($1, 'access', $2, $3, now() + interval '1 hour'),
            ($4, 'refresh', $2, $3, now() + interval '14 days')`,
    [hashSecret(access), profileId, clientId, hashSecret(refresh)]
  )
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_MS / 1000,
  }
}

export async function rotateRefresh(refresh: string, clientId: string) {
  const pool = getPool()
  const rows = await pool.query<{ profile_id: string; expires_at: Date; revoked_at: Date | null }>(
    `SELECT profile_id, expires_at, revoked_at
     FROM payments.mcp_tokens
     WHERE token_hash = $1 AND kind = 'refresh' AND client_id = $2`,
    [hashSecret(refresh), clientId]
  )
  const row = rows.rows[0]
  if (!row) return null
  if (row.revoked_at) {
    await pool.query(
      `UPDATE payments.mcp_tokens
       SET revoked_at = now()
       WHERE profile_id = $1 AND client_id = $2 AND revoked_at IS NULL`,
      [row.profile_id, clientId]
    )
    return null
  }
  if (row.expires_at.getTime() < Date.now()) return null
  await pool.query(`UPDATE payments.mcp_tokens SET revoked_at = now() WHERE token_hash = $1`, [
    hashSecret(refresh),
  ])
  return issueTokenPair(row.profile_id, clientId)
}

export async function principalFromAccessToken(token: string) {
  const rows = await getPool().query<{ id: string; email: string; client_id: string }>(
    `SELECT p.id, p.email, t.client_id
     FROM payments.mcp_tokens t
     JOIN payments.profiles p ON p.id = t.profile_id
     JOIN payments.admin_users au ON au.id = p.id AND au.is_active IS TRUE
     WHERE t.token_hash = $1
       AND t.kind = 'access'
       AND t.revoked_at IS NULL
       AND t.expires_at > now()`,
    [hashSecret(token)]
  )
  const row = rows.rows[0]
  if (!row) return null
  return { id: row.id, email: row.email, clientId: row.client_id }
}

export async function listTokens(profileId: string) {
  const rows = await getPool().query(
    `SELECT id, client_id, kind, expires_at, revoked_at
     FROM payments.mcp_tokens
     WHERE profile_id = $1
     ORDER BY expires_at DESC
     LIMIT 20`,
    [profileId]
  )
  return rows.rows
}

export async function revokeToken(id: string, profileId: string) {
  const rows = await getPool().query(
    `UPDATE payments.mcp_tokens SET revoked_at = now()
     WHERE id = $1 AND profile_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [id, profileId]
  )
  return Boolean(rows.rows[0])
}
