import { NextResponse } from 'next/server'

import { computeSetupStatus } from '@/lib/admin/setup-status'
import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'

export const GET = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    return NextResponse.json(await computeSetupStatus())
  },
  { module: 'admin', action: 'setup_status_get' }
)
