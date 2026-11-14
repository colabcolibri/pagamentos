import 'server-only'

import { createTtlCache } from '@/lib/cache/ttl-cache'
import { getPool } from '@/lib/db/pool'

import { POLICY_KEYS } from '../core/types'
import type { McpAction, PolicyConfig } from './decide'

const ACTIONS: McpAction[] = ['read', 'upsert', 'delete']
const POLICY_CACHE_TTL_MS = 30_000

async function fetchPolicyConfig(): Promise<PolicyConfig> {
  const pool = getPool()
  const [settings, rows] = await Promise.all([
    pool.query<{ enabled: boolean }>('SELECT enabled FROM payments.mcp_settings WHERE id = 1'),
    pool.query<{ policy_key: string; action: McpAction; enabled: boolean }>(
      'SELECT policy_key, action, enabled FROM payments.mcp_policy'
    ),
  ])
  const grants: Record<string, McpAction[]> = {}
  for (const row of rows.rows) {
    if (!row.enabled) continue
    grants[row.policy_key] ??= []
    grants[row.policy_key].push(row.action)
  }
  return { enabled: settings.rows[0]?.enabled === true, grants }
}

const policyConfigCache = createTtlCache(POLICY_CACHE_TTL_MS, fetchPolicyConfig)

export function loadPolicyConfig(): Promise<PolicyConfig> {
  return policyConfigCache.get()
}

export function invalidatePolicyConfigCache(): void {
  policyConfigCache.invalidate()
}

export async function readPolicyView() {
  const config = await loadPolicyConfig()
  const policies = Object.fromEntries(
    POLICY_KEYS.map((key) => [
      key,
      {
        read: config.grants[key]?.includes('read') ?? false,
        upsert: config.grants[key]?.includes('upsert') ?? false,
        delete: config.grants[key]?.includes('delete') ?? false,
      },
    ])
  )
  return { enabled: config.enabled, policies }
}

export async function savePolicy(input: {
  enabled?: boolean
  policies?: Record<string, Partial<Record<McpAction, boolean>>>
}) {
  const pool = getPool()
  if (input.enabled !== undefined) {
    await pool.query('UPDATE payments.mcp_settings SET enabled = $1 WHERE id = 1', [input.enabled])
  }

  const keys: string[] = []
  const actionsToSave: McpAction[] = []
  const flags: boolean[] = []

  for (const [key, actions] of Object.entries(input.policies ?? {})) {
    if (!POLICY_KEYS.includes(key as (typeof POLICY_KEYS)[number])) continue
    for (const action of ACTIONS) {
      if (actions[action] === undefined) continue
      keys.push(key)
      actionsToSave.push(action)
      flags.push(actions[action] as boolean)
    }
  }

  if (keys.length > 0) {
    await pool.query(
      `INSERT INTO payments.mcp_policy (policy_key, action, enabled)
       SELECT * FROM UNNEST($1::text[], $2::text[], $3::boolean[])
       ON CONFLICT (policy_key, action) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [keys, actionsToSave, flags]
    )
  }

  invalidatePolicyConfigCache()
  return readPolicyView()
}
