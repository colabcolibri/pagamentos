/**
 * GET/PATCH /api/admin/platform-settings
 * Destinatários de venda e configuração dos gateways.
 * Segredos nunca voltam na resposta.
 */
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { loadGatewayConfig, toAdminGatewayView } from '@/lib/payments/gateway-config'
import {
  platformSettingsPatchSchema,
  updatePlatformSettings,
} from '@/lib/payments/update-platform-settings'
import { loadInstanceConfig, toAdminInstanceView } from '@/lib/platform/instance-config'

async function currentView() {
  const [gateway, instance] = await Promise.all([loadGatewayConfig(), loadInstanceConfig()])
  return {
    ...toAdminGatewayView(gateway),
    ...toAdminInstanceView(instance),
  }
}

export const GET = createApiHandler(
  async () => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }
    return NextResponse.json(await currentView())
  },
  { module: 'admin', action: 'platform_settings_get' }
)

export const PATCH = createApiHandler(
  async (request: Request) => {
    const authResult = await requireAdmin()
    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json().catch(() => ({}))
    const parsed = platformSettingsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    try {
      const view = await updatePlatformSettings(parsed.data)
      return NextResponse.json({ ok: true, ...view })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erro ao salvar' },
        { status: 400 }
      )
    }
  },
  { module: 'admin', action: 'platform_settings_patch' }
)
