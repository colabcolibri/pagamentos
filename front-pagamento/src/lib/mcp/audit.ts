import 'server-only'

import { getPool } from '@/lib/db/pool'

import type { AuditEvent } from './core/execute-tool'

export async function auditMcpCall(event: AuditEvent): Promise<void> {
  const detail = `${event.tool}:${event.action}:${event.outcome}:${event.detail}`.slice(0, 240)
  await getPool().query(
    `INSERT INTO payments.admin_audit_events (actor_id, action, target_type, target_id, detail)
     VALUES ($1, 'mcp.tool.call', 'mcp_tool', $2, $3)`,
    [event.principal.id, event.principal.id, detail]
  )
}
