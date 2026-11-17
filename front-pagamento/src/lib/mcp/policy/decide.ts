export type McpAction = 'read' | 'upsert' | 'delete'

export const ACTION_LEVEL: Record<McpAction, number> = {
  read: 1,
  upsert: 2,
  delete: 3,
}

export type PolicyActionsState = Record<McpAction, boolean>

/**
 * Mantém as permissões escalonadas consistentes (Ler < Gravar < Apagar):
 * ligar um nível superior libera os anteriores; desligar um nível inferior revoga os superiores.
 */
export function cascadeModuleActions(
  current: PolicyActionsState,
  action: McpAction,
  checked: boolean
): PolicyActionsState {
  const level = ACTION_LEVEL[action]
  return {
    read: checked
      ? current.read || level >= ACTION_LEVEL.read
      : level <= ACTION_LEVEL.read
        ? false
        : current.read,
    upsert: checked
      ? current.upsert || level >= ACTION_LEVEL.upsert
      : level <= ACTION_LEVEL.upsert
        ? false
        : current.upsert,
    delete: checked
      ? current.delete || level >= ACTION_LEVEL.delete
      : level <= ACTION_LEVEL.delete
        ? false
        : current.delete,
  }
}

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
  const maxGrantedLevel = grants.reduce((max, action) => Math.max(max, ACTION_LEVEL[action]), 0)
  if (maxGrantedLevel < ACTION_LEVEL[tool.action]) {
    return { allowed: false, reason: 'acao_desligada' }
  }
  return { allowed: true }
}

export function filterAllowed<T extends ToolRef>(tools: readonly T[], config: PolicyConfig): T[] {
  return tools.filter((tool) => decideAccess(tool, config).allowed)
}
