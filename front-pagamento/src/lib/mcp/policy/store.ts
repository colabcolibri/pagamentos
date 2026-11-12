import 'server-only'

import { getPool } from '@/lib/db/pool'

import { POLICY_KEYS } from '../core/types'
import type { McpAction, PolicyConfig } from './decide'

const ACTIONS: McpAction[] = ['read', 'upsert', 'delete']

export async function loadPolicyConfig(): Promise<PolicyConfig> {
  const pool = getPool()
  const settings = await pool.query<{ enabled: boolean }>(
    'SELECT enabled FROM payments.mcp_settings WHERE id = 1'
  )
  const rows = await pool.query<{ policy_key: string; action: McpAction; enabled: boolean }>(
    'SELECT policy_key, action, enabled FROM payments.mcp_policy'
  )
  const grants: Record<string, McpAction[]> = {}
  for (const row of rows.rows) {
    if (!row.enabled) continue
    grants[row.policy_key] ??= []
    grants[row.policy_key].push(row.action)
  }
  return { enabled: settings.rows[0]?.enabled === true, grants }
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
  for (const [key, actions] of Object.entries(input.policies ?? {})) {
    if (!POLICY_KEYS.includes(key as (typeof POLICY_KEYS)[number])) continue
    for (const action of ACTIONS) {
      if (actions[action] === undefined) continue
      await pool.query(
        `INSERT INTO payments.mcp_policy (policy_key, action, enabled)
         VALUES ($1, $2, $3)
         ON CONFLICT (policy_key, action) DO UPDATE SET enabled = EXCLUDED.enabled`,
        [key, action, actions[action]]
      )
    }
  }
  return readPolicyView()
}
