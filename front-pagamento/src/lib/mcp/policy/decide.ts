export type McpAction = 'read' | 'upsert' | 'delete'

export type PolicyConfig = {
  enabled: boolean
  grants: Readonly<Record<string, readonly McpAction[]>>
}

export type ToolRef = {
  name: string
  policyKey: string
  action: McpAction
}

export type DenyReason = 'mcp_desligado' | 'acao_desligada' | 'confirmacao' | 'dry_run_sem_escrita'

export type Decision = { allowed: true } | { allowed: false; reason: DenyReason }

export const DENY_MESSAGES: Record<DenyReason, string> = {
  mcp_desligado: 'O MCP está desligado pela administração.',
  acao_desligada: 'Esta ação está desligada para esta ferramenta.',
  confirmacao: 'Esta ação pede confirmar=true.',
  dry_run_sem_escrita: 'dry_run só vale para escrita.',
}

export function decideAccess(tool: ToolRef, config: PolicyConfig): Decision {
  if (!config.enabled) return { allowed: false, reason: 'mcp_desligado' }
  const grants = config.grants[tool.policyKey] ?? []
  if (!grants.includes(tool.action)) return { allowed: false, reason: 'acao_desligada' }
  return { allowed: true }
}

export function filterAllowed<T extends ToolRef>(tools: readonly T[], config: PolicyConfig): T[] {
  return tools.filter((tool) => decideAccess(tool, config).allowed)
}
