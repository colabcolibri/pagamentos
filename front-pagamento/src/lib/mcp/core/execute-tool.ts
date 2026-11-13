import type { z } from 'zod'

import { DENY_MESSAGES, type PolicyConfig, decideAccess } from '../policy/decide'
import type { McpPrincipal, McpTool } from './types'

export type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

export type AuditEvent = {
  principal: McpPrincipal
  tool: string
  action: string
  outcome: 'permitido' | 'negado' | 'erro' | 'simulado'
  detail: string
}

export type ExecuteDeps = {
  loadPolicy: () => Promise<PolicyConfig>
  audit: (event: AuditEvent) => Promise<void>
}

const text = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
  ...(isError ? { isError: true } : {}),
})

function splitControl(args: unknown): {
  args: unknown
  dryRun: boolean
  confirmed: boolean
} {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return { args, dryRun: false, confirmed: false }
  }
  const { dry_run, confirmar, ...rest } = args as Record<string, unknown>
  return { args: rest, dryRun: dry_run === true, confirmed: confirmar === true }
}

export async function executeTool(
  tool: McpTool,
  rawArgs: unknown,
  principal: McpPrincipal,
  deps: ExecuteDeps
): Promise<ToolResult> {
  const policy = await deps.loadPolicy()
  const decision = decideAccess(tool, policy)
  if (!decision.allowed) {
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: 'negado',
      detail: decision.reason,
    })
    return text(DENY_MESSAGES[decision.reason], true)
  }

  const { args, dryRun, confirmed } = splitControl(rawArgs)
  if (dryRun && tool.action === 'read') {
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: 'negado',
      detail: 'dry_run_sem_escrita',
    })
    return text(DENY_MESSAGES.dry_run_sem_escrita, true)
  }
  if (tool.risk === 'alto' && tool.action !== 'read' && !dryRun && !confirmed) {
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: 'negado',
      detail: 'confirmacao',
    })
    return text(DENY_MESSAGES.confirmacao, true)
  }

  const parsed = tool.input.safeParse(args)
  if (!parsed.success) {
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: 'erro',
      detail: 'argumento_invalido',
    })
    return text({ error: 'Argumento inválido' }, true)
  }

  try {
    const value = await tool.handler(parsed.data as z.infer<typeof tool.input>, {
      principal,
      dryRun,
      confirmed,
      hasGrant: (policyKey, action) => Boolean(policy.grants[policyKey]?.includes(action)),
    })
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: dryRun ? 'simulado' : 'permitido',
      detail: dryRun ? 'simulado' : 'ok',
    })
    return text(value)
  } catch (error) {
    await deps.audit({
      principal,
      tool: tool.name,
      action: tool.action,
      outcome: 'erro',
      detail: 'erro',
    })
    return text({ error: error instanceof Error ? error.message : 'Erro ao executar' }, true)
  }
}
