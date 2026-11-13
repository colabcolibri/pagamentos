import 'server-only'
import { z } from 'zod'

import { maskSecret } from '@/lib/payments/gateway-config'

import type { McpTool, McpToolContext } from '../core/types'
import type { McpAction } from '../policy/decide'

/**
 * Gera o JSON Schema de entrada da ferramenta a partir do schema Zod (fonte única)
 * e injeta os controles `dry_run` e `confirmar` em ferramentas de escrita.
 */
export function toToolParameters(input: z.ZodType, action: McpAction): Record<string, unknown> {
  const raw = z.toJSONSchema(input, { unrepresentable: 'any' }) as Record<string, unknown>
  const { $schema: _ignored, ...schema } = raw
  if (action === 'read') return schema

  const properties =
    schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
      ? (schema.properties as Record<string, unknown>)
      : {}

  return {
    ...schema,
    type: schema.type ?? 'object',
    properties: {
      ...properties,
      dry_run: {
        type: 'boolean',
        description: 'Quando true, simula a operação sem gravar no banco.',
      },
      confirmar: {
        type: 'boolean',
        description: 'Obrigatório (true) para executar ferramentas de risco alto.',
      },
    },
  }
}

export function defineTool<I extends z.ZodType>(
  tool: Omit<McpTool<I>, 'parameters'> & { parameters?: Record<string, unknown> }
): McpTool<I> {
  return {
    ...tool,
    parameters: tool.parameters ?? toToolParameters(tool.input, tool.action),
  }
}

export function guardWrite(ctx: McpToolContext, preview: unknown) {
  if (ctx.dryRun) return { dry_run: true, preview }
  return null
}

export function maskProduct(product: Record<string, unknown>) {
  const secret = typeof product.webhook_secret === 'string' ? product.webhook_secret : null
  const { webhook_secret: _secret, ...rest } = product
  return { ...rest, webhook_secret: maskSecret(secret) }
}
