import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { getPool } from '@/lib/db/pool'
import { createApiHandlerWithParams } from '@/lib/errors'

export const GET = createApiHandlerWithParams<{ id: string }>(
  async (_request: Request, context) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const { id } = await context.params
    const result = await getPool().query('SELECT * FROM payments.email_logs WHERE id = $1', [id])
    const data = result.rows[0]
    if (!data) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ emailLog: data })
  },
  { module: 'admin', action: 'get_email_log' }
)
