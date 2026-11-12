import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandler } from '@/lib/errors'

export const GET = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) return authResult.response

    const result = await getPool().query(
      `SELECT id, name, email, role, is_active, created_at
       FROM payments.admin_users
       ORDER BY created_at DESC`
    )
    return NextResponse.json({ admins: result.rows })
  },
  { module: 'admin', action: 'list_admins' }
)
