'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { POLICY_KEYS } from '@/lib/mcp/core/types'
import { type PolicyActionsState, cascadeModuleActions } from '@/lib/mcp/policy/decide'

export type PolicyMap = Record<string, PolicyActionsState>

export const POLICY_DETAILS: Record<
  (typeof POLICY_KEYS)[number],
  { label: string; description: string }
> = {
  identidade: {
    label: 'Identidade',
    description: 'Consulta quem é o administrador autenticado na sessão MCP.',
  },
  produto: {
    label: 'Produtos',
    description: 'Lista, cria, edita ou remove produtos, preços, metas e configurações de entrega.',
  },
  ia: {
    label: 'IA',
    description:
      'Gera copy, descrições e sugestões de produto usando as chaves de IA configuradas.',
  },
  pedido: {
    label: 'Pedidos',
    description:
      'Consulta pedidos, status, cliente e executa ações administrativas como baixa ou cancelamento.',
  },
  pagamento: {
    label: 'Pagamentos',
    description: 'Inspeciona cobranças geradas no Asaas e Pagar.me (PIX, boleto, cartão).',
  },
  cupom: {
    label: 'Cupons',
    description: 'Lista, cria, ativa/desativa ou exclui cupons de desconto.',
  },
  assinatura: {
    label: 'Assinaturas',
    description: 'Acompanha e gerencia assinaturas recorrentes vinculadas aos pedidos.',
  },
  email: {
    label: 'E-mails',
    description:
      'Consulta histórico de disparos (email_logs) e solicita reenvio de e-mails de pedido.',
  },
  admin: {
    label: 'Admins',
    description: 'Lista, adiciona ou remove usuários com acesso administrativo ao painel.',
  },
  config: {
    label: 'Chaves & Configurações',
    description: 'Lê status e atualiza chaves de gateways, webhooks e integrações da plataforma.',
  },
  webhook: {
    label: 'Webhooks recebidos',
    description:
      'Inspeciona eventos brutos recebidos dos gateways (Asaas / Pagar.me) para diagnóstico.',
  },
  auditoria: {
    label: 'Auditoria',
    description: 'Consulta a trilha de ações administrativas registradas no banco.',
  },
  reembolso: {
    label: 'Reembolso',
    description: 'Lê modelos de política de reembolso configurados para os produtos.',
  },
  conexao: {
    label: 'Conexões',
    description: 'Executa testes de conectividade com Postgres, gateways e webhooks.',
  },
  resumo: {
    label: 'Resumo',
    description: 'Lê métricas consolidadas e séries de gráficos do dashboard.',
  },
}

const ACTION_LABELS: { key: keyof PolicyActionsState; label: string; hint: string }[] = [
  { key: 'read', label: 'Ler', hint: 'Consultar e listar dados' },
  { key: 'upsert', label: 'Gravar', hint: 'Criar ou alterar registros (inclui Ler)' },
  { key: 'delete', label: 'Apagar', hint: 'Remover registros (inclui Ler e Gravar)' },
]

export function countEnabledModules(policies: PolicyMap): number {
  return POLICY_KEYS.filter((key) => {
    const actions = policies[key]
    return Boolean(actions?.read || actions?.upsert || actions?.delete)
  }).length
}

export function McpPolicyMatrix({
  policies,
  onChange,
}: {
  policies: PolicyMap
  onChange: (next: PolicyMap) => void
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">
        Escalonado: <strong>Ler &lt; Gravar &lt; Apagar</strong> (marcar um nível libera os
        anteriores automaticamente).
      </p>
      <div className="grid gap-2">
        {POLICY_KEYS.map((key) => {
          const detail = POLICY_DETAILS[key]
          const current = policies[key] ?? { read: false, upsert: false, delete: false }
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-medium">{detail.label}</div>
                <p className="text-xs text-muted-foreground">{detail.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {ACTION_LABELS.map((action) => (
                  <label
                    key={action.key}
                    title={action.hint}
                    className="flex cursor-pointer items-center gap-2 text-sm select-none"
                  >
                    <Checkbox
                      checked={current[action.key] ?? false}
                      onCheckedChange={(checked) => {
                        onChange({
                          ...policies,
                          [key]: cascadeModuleActions(current, action.key, Boolean(checked)),
                        })
                      }}
                    />
                    {action.label}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
