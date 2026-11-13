import 'server-only'
import { z } from 'zod'

import { loadGatewayConfig, toAdminGatewayView } from '@/lib/payments/gateway-config'
import {
  platformSettingsPatchSchema,
  updatePlatformSettings,
} from '@/lib/payments/update-platform-settings'

import type { McpTool } from '../../core/types'
import { defineTool, guardWrite } from '../shared'

export const SETTINGS_TOOLS: McpTool[] = [
  defineTool({
    name: 'config_ler',
    title: 'Ler configurações',
    description: 'Mostra gateways e o trecho mascarado das chaves.',
    policyKey: 'config',
    action: 'read',
    risk: 'baixo',
    input: z.object({}),
    handler: async () => toAdminGatewayView(await loadGatewayConfig()),
  }),
  defineTool({
    name: 'config_salvar',
    title: 'Salvar configurações',
    description:
      'Altera aviso, gateway ou chave. Campo vazio não apaga segredo. A resposta vem mascarada.',
    policyKey: 'config',
    action: 'upsert',
    risk: 'alto',
    input: platformSettingsPatchSchema,
    handler: async (args, ctx) => {
      const preview = guardWrite(ctx, { fields: Object.keys(args) })
      if (preview) return preview
      return updatePlatformSettings(args)
    },
  }),
]
