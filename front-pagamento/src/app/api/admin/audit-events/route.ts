import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'

export const GET = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const result = await getPool().query(
      `SELECT id, actor_id, action, target_type, target_id, detail, created_at
       FROM payments.admin_audit_events
       ORDER BY created_at DESC
       LIMIT 50`
    )
    return NextResponse.json({ events: result.rows })
  },
  { module: 'admin', action: 'list_audit_events' }
)
