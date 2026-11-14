'use client'

import { useEffect, useState } from 'react'

import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { POLICY_KEYS } from '@/lib/mcp/core/types'

type Actions = { read: boolean; upsert: boolean; delete: boolean }

type PolicyView = {
  enabled: boolean
  policies: Record<string, Actions>
}

type TokenRow = {
  id: string
  client_id: string
  kind: string
  expires_at: string
  revoked_at: string | null
}

const POLICY_DETAILS: Record<(typeof POLICY_KEYS)[number], { label: string; description: string }> =
  {
    identidade: {
      label: 'Identidade',
      description: 'Consulta quem é o administrador autenticado na sessão MCP.',
    },
    produto: {
      label: 'Produtos',
      description:
        'Lista, cria, edita ou remove produtos, preços, metas e configurações de entrega.',
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
      description: 'Lê métricas consolidadas do dashboard (receita, pedidos e status geral).',
    },
  }

const ACTION_LABELS: { key: keyof Actions; label: string; hint: string }[] = [
  { key: 'read', label: 'Ler', hint: 'Consultar e listar dados' },
  { key: 'upsert', label: 'Gravar', hint: 'Criar ou alterar registros' },
  { key: 'delete', label: 'Apagar', hint: 'Remover registros (use com cautela)' },
]

export function McpSettingsCard() {
  const [policy, setPolicy] = useState<PolicyView | null>(null)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void Promise.all([
      fetch('/api/admin/mcp-policy').then((response) => response.json()),
      fetch('/api/admin/mcp-tokens').then((response) => response.json()),
    ]).then(([policyBody, tokenBody]) => {
      if (policyBody?.policies) setPolicy(policyBody as PolicyView)
      if (Array.isArray(tokenBody?.tokens)) setTokens(tokenBody.tokens as TokenRow[])
    })
  }, [])

  async function save(next: PolicyView) {
    setSaving(true)
    setPolicy(next)
    const response = await fetch('/api/admin/mcp-policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    setSaving(false)
    if (!response.ok) {
      toast.error('Não foi possível salvar o MCP.')
      return
    }
    setPolicy((await response.json()) as PolicyView)
  }

  async function revoke(id: string) {
    const response = await fetch('/api/admin/mcp-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) {
      toast.error('Não foi possível revogar.')
      return
    }
    setTokens((current) =>
      current.map((token) =>
        token.id === id ? { ...token, revoked_at: new Date().toISOString() } : token
      )
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP (Model Context Protocol)</CardTitle>
        <CardDescription>
          Permite conectar assistentes de IA externos (como Claude Desktop, Cursor ou ChatGPT) ao
          seu painel administrativo usando autenticação OAuth com o mesmo código de e-mail do admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!policy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-3.5">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Interruptor mestre do MCP</span>
                <p className="text-xs text-muted-foreground">
                  Quando desligado, todas as ferramentas MCP ficam bloqueadas mesmo que existam
                  tokens ativos. Por segurança, começa desligado.
                </p>
              </div>
              <Switch
                checked={policy.enabled}
                disabled={saving}
                onCheckedChange={(checked) => void save({ ...policy, enabled: checked })}
                aria-label="Ligar o MCP"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">Permissões por módulo</p>
                <p className="text-xs text-muted-foreground">
                  Ler = consultar · Gravar = criar/editar · Apagar = excluir
                </p>
              </div>
              <div className="grid gap-2.5">
                {POLICY_KEYS.map((key) => {
                  const detail = POLICY_DETAILS[key]
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{detail.label}</div>
                        <p className="text-xs text-muted-foreground">{detail.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-3">
                        {ACTION_LABELS.map((action) => (
                          <label
                            key={action.key}
                            title={action.hint}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={policy.policies[key]?.[action.key] ?? false}
                              disabled={saving}
                              onChange={(event) => {
                                const policies = {
                                  ...policy.policies,
                                  [key]: {
                                    ...policy.policies[key],
                                    [action.key]: event.target.checked,
                                  },
                                }
                                void save({ ...policy, policies })
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
          </>
        )}
        <div className="space-y-2 border-t pt-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Tokens OAuth emitidos para este admin</p>
            <p className="text-xs text-muted-foreground">
              Cada cliente MCP conectado recebe um token próprio. Ao revogar, o acesso daquele
              cliente é interrompido imediatamente na próxima chamada.
            </p>
          </div>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum token emitido.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-all text-sm">
                    {token.kind} · {token.revoked_at ? 'revogado' : 'ativo'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={Boolean(token.revoked_at)}
                    onClick={() => void revoke(token.id)}
                  >
                    Revogar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
