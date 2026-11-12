import type { Pool } from 'pg'

export type AdminAuditInput = {
  actorId: string
  action: 'order.mark_paid' | 'order.cancel' | 'order.delete' | 'payment.cancel'
  targetType: 'order' | 'payment'
  targetId: string
}

export async function recordAdminAction(pool: Pool, input: AdminAuditInput): Promise<void> {
  await pool.query(
    `INSERT INTO payments.admin_audit_events (actor_id, action, target_type, target_id)
     VALUES ($1, $2, $3, $4)`,
    [input.actorId, input.action, input.targetType, input.targetId]
  )
}
