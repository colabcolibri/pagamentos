import 'server-only'
import { z } from 'zod'

import { auditMcpCall } from '../audit'
import { filterAllowed } from '../policy/decide'
import { loadPolicyConfig } from '../policy/store'
import { executeTool } from './execute-tool'
import type { McpPrincipal, McpTool } from './types'

const callSchema = z.object({
  name: z.string(),
  arguments: z.unknown().optional(),
})

export function createDispatcher(tools: readonly McpTool[]) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))

  return async function dispatch(method: string, params: unknown, principal: McpPrincipal) {
    if (method === 'ping') return {}
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return {}
    if (method === 'initialize') {
      return {
        protocolVersion: '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'quitou', version: '1' },
      }
    }
    if (method === 'tools/list') {
      const policy = await loadPolicyConfig()
      return {
        tools: filterAllowed(tools, policy).map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      }
    }
    if (method === 'tools/call') {
      const parsed = callSchema.safeParse(params)
      if (!parsed.success) return { error: { code: -32602, message: 'Argumento inválido' } }
      const tool = byName.get(parsed.data.name)
      if (!tool) return { error: { code: -32602, message: 'Ferramenta desconhecida' } }
      return executeTool(tool, parsed.data.arguments ?? {}, principal, {
        loadPolicy: loadPolicyConfig,
        audit: auditMcpCall,
      })
    }
    return { error: { code: -32601, message: 'Método desconhecido' } }
  }
}
