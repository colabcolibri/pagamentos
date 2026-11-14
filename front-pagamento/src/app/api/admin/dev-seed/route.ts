import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import {
  DevSeedAlreadyExecutedError,
  DevSeedForbiddenError,
  DevSeedHealthCheckError,
  getDevSeedStatus,
  isDevSeedEnabled,
  runDevSeed,
} from '@/lib/dev/dev-seed'
import { createApiHandler } from '@/lib/errors'

export const GET = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const status = await getDevSeedStatus()
    return NextResponse.json(status)
  },
  { module: 'admin', action: 'dev_seed_status' }
)

export const POST = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    if (!isDevSeedEnabled()) {
      return NextResponse.json(
        { error: 'Carga dev disponível apenas fora de produção.' },
        { status: 403 }
      )
    }

    try {
      const result = await runDevSeed(authResult.user.id)
      return NextResponse.json({
        enabled: true,
        executed: true,
        executedAt: result.executedAt,
        summary: result.summary,
      })
    } catch (error) {
      if (error instanceof DevSeedForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error instanceof DevSeedHealthCheckError) {
        return NextResponse.json({ error: error.message, health: error.health }, { status: 422 })
      }
      if (error instanceof DevSeedAlreadyExecutedError) {
        return NextResponse.json(
          {
            error: error.message,
            executed: true,
            executedAt: error.executedAt,
            summary: error.summary,
          },
          { status: 409 }
        )
      }
      throw error
    }
  },
  { module: 'admin', action: 'dev_seed_run' }
)
