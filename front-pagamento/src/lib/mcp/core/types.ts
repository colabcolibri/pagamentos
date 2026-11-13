import type { z } from 'zod'

import type { McpAction } from '../policy/decide'

export type McpRisk = 'baixo' | 'medio' | 'alto'

export type McpPrincipal = {
  id: string
  email: string
  clientId: string
}

export type McpToolContext = {
  principal: McpPrincipal
  dryRun: boolean
  confirmed: boolean
  hasGrant: (policyKey: string, action: McpAction) => boolean
}

export type McpTool<I extends z.ZodType = z.ZodType> = {
  name: string
  title: string
  description: string
  policyKey: string
  action: McpAction
  risk: McpRisk
  input: I
  parameters: Record<string, unknown>
  handler: (args: z.infer<I>, ctx: McpToolContext) => Promise<unknown>
}

export const POLICY_KEYS = [
  'identidade',
  'produto',
  'ia',
  'pedido',
  'pagamento',
  'cupom',
  'assinatura',
  'email',
  'admin',
  'config',
  'webhook',
  'auditoria',
  'reembolso',
  'conexao',
  'resumo',
] as const
