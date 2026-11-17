'use client'

import { useEffect, useState } from 'react'

import { KeyRound, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardButton } from '@/components/ui/clipboard-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { POLICY_KEYS } from '@/lib/mcp/core/types'
import { cascadeModuleActions } from '@/lib/mcp/policy/decide'

type Actions = { read: boolean; upsert: boolean; delete: boolean }

type PolicyView = {
  enabled: boolean
  policies: Record<string, Actions>
}

type TokenRow = {
  id: string
  client_id: string | null
  kind: string
  label: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at?: string
}

type CreatedTokenView = {
  id: string
  label: string
  token: string
  expires_at: string | null
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

function buildMcpSnippets(endpoint: string, tokenOrPlaceholder: string) {
  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        quitou: {
          url: endpoint,
          headers: {
            Authorization: `Bearer ${tokenOrPlaceholder}`,
          },
        },
      },
    },
    null,
    2
  )

  const curlTest = [
    `curl -X POST "${endpoint}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Authorization: Bearer ${tokenOrPlaceholder}" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'`,
  ].join('\n')

  const agentPrompt = [
    `Conecte ao servidor MCP do Quitou via HTTP JSON-RPC 2.0:`,
    `- Endpoint: POST ${endpoint}`,
    `- Autenticação: Authorization: Bearer ${tokenOrPlaceholder}`,
    `- Handshake: {"jsonrpc":"2.0","id":1,"method":"initialize"}`,
    `- Listar ferramentas: {"jsonrpc":"2.0","id":2,"method":"tools/list"}`,
    `- Executar ferramenta: {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"<nome>","arguments":{}}}`,
    `- OAuth (alternativo para clientes com suporte a OAuth 2.1 + PKCE): ${endpoint.replace(/\/api\/mcp$/, '')}/.well-known/oauth-protected-resource`,
  ].join('\n')

  return { mcpConfigJson, curlTest, agentPrompt }
}

export function McpSettingsCard() {
  const [policy, setPolicy] = useState<PolicyView | null>(null)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [saving, setSaving] = useState(false)
  const [tokenLabel, setTokenLabel] = useState('')
  const [expiresOption, setExpiresOption] = useState('90')
  const [creatingToken, setCreatingToken] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreatedTokenView | null>(null)
  const [mcpEndpoint, setMcpEndpoint] = useState('/api/mcp')

  useEffect(() => {
    setMcpEndpoint(`${window.location.origin}/api/mcp`)
    void Promise.all([
      fetch('/api/admin/mcp-policy').then((response) => response.json()),
      fetch('/api/admin/mcp-tokens').then((response) => response.json()),
    ]).then(([policyBody, tokenBody]) => {
      if (policyBody?.policies) setPolicy(policyBody as PolicyView)
      if (Array.isArray(tokenBody?.tokens)) setTokens(tokenBody.tokens as TokenRow[])
    })
  }, [])

  async function createToken(event: React.FormEvent) {
    event.preventDefault()
    const label = tokenLabel.trim()
    if (label.length < 2) {
      toast.error('Informe um nome com pelo menos 2 caracteres.')
      return
    }
    setCreatingToken(true)
    const expiresInDays = expiresOption === 'never' ? null : Number(expiresOption)
    const response = await fetch('/api/admin/mcp-tokens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, expiresInDays }),
    })
    setCreatingToken(false)
    const body = (await response.json().catch(() => null)) as {
      token?: CreatedTokenView & TokenRow
      error?: string
    } | null
    if (!response.ok || !body?.token) {
      toast.error(body?.error ?? 'Não foi possível gerar a chave MCP.')
      return
    }
    const generated = body.token
    setCreatedToken({
      id: generated.id,
      label: generated.label,
      token: generated.token,
      expires_at: generated.expires_at,
    })
    setTokens((current) => [
      {
        id: generated.id,
        client_id: null,
        kind: 'pat',
        label: generated.label,
        expires_at: generated.expires_at,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
      ...current,
    ])
    setTokenLabel('')
    toast.success(`Chave "${generated.label}" gerada.`)
  }

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
          seu painel administrativo via OAuth ou por chaves manuais nomeadas geradas abaixo.
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
                  Escalonado: Ler &lt; Gravar &lt; Apagar (marcar um nível libera os anteriores)
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
                                const current = policy.policies[key] ?? {
                                  read: false,
                                  upsert: false,
                                  delete: false,
                                }
                                const policies = {
                                  ...policy.policies,
                                  [key]: cascadeModuleActions(
                                    current,
                                    action.key,
                                    event.target.checked
                                  ),
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
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Chaves e tokens de acesso</p>
            <p className="text-xs text-muted-foreground">
              Conecte via OAuth ou gere uma chave manual nomeada para clientes que usam{' '}
              <code>Authorization: Bearer</code>.
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  URL do servidor MCP
                </span>
                <code className="block truncate text-xs font-mono">{mcpEndpoint}</code>
              </div>
              <ClipboardButton
                text={mcpEndpoint}
                size="sm"
                variant="outline"
                successMessage="URL do MCP copiada"
              />
            </div>
          </div>

          <form
            onSubmit={createToken}
            className="grid gap-3 rounded-lg border border-border/60 p-3.5 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="mcp-token-label">Nome da chave</Label>
              <Input
                id="mcp-token-label"
                placeholder="Ex.: Cursor MacBook, Claude Desktop"
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
                maxLength={80}
                disabled={creatingToken}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-token-expiry">Validade</Label>
              <Select
                value={expiresOption}
                onValueChange={(value) => setExpiresOption(value ?? '90')}
              >
                <SelectTrigger id="mcp-token-expiry" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="never">Sem expiração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={creatingToken || tokenLabel.trim().length < 2}>
              {creatingToken ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar chave
            </Button>
          </form>

          {createdToken && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Chave gerada: {createdToken.label}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copie agora. Por segurança, o token completo não será exibido novamente depois
                    que você fechar este aviso.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreatedToken(null)}
                >
                  Já copiei
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">Token</span>
                    <code className="block truncate text-xs font-mono">{createdToken.token}</code>
                  </div>
                  <ClipboardButton
                    text={createdToken.token}
                    size="sm"
                    variant="outline"
                    successMessage="Token copiado"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-muted-foreground">Header HTTP</span>
                    <code className="block truncate text-xs font-mono">
                      Authorization: Bearer {createdToken.token}
                    </code>
                  </div>
                  <ClipboardButton
                    text={`Authorization: Bearer ${createdToken.token}`}
                    size="sm"
                    variant="outline"
                    successMessage="Header copiado"
                  />
                </div>

                <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] text-muted-foreground">
                      Configuração JSON (Cursor / clientes HTTP)
                    </span>
                    <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-muted-foreground">
                      {JSON.stringify(
                        {
                          url: mcpEndpoint,
                          headers: { Authorization: `Bearer ${createdToken.token}` },
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <ClipboardButton
                    text={JSON.stringify(
                      {
                        url: mcpEndpoint,
                        headers: { Authorization: `Bearer ${createdToken.token}` },
                      },
                      null,
                      2
                    )}
                    size="sm"
                    variant="outline"
                    successMessage="Configuração JSON copiada"
                  />
                </div>
              </div>
            </div>
          )}

          {(() => {
            const snippetToken = createdToken?.token ?? '<SUA_CHAVE_MCP>'
            const { mcpConfigJson, curlTest, agentPrompt } = buildMcpSnippets(
              mcpEndpoint,
              snippetToken
            )
            return (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Instruções de conexão para agentes</p>
                  <p className="text-xs text-muted-foreground">
                    {createdToken
                      ? `Os códigos abaixo já estão preenchidos com a chave "${createdToken.label}".`
                      : 'Gere uma chave acima para preencher automaticamente os códigos abaixo, ou substitua <SUA_CHAVE_MCP>.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        Configuração mcpServers (Cursor / Claude / Antigravity / Windsurf)
                      </span>
                      <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-muted-foreground">
                        {mcpConfigJson}
                      </pre>
                    </div>
                    <ClipboardButton
                      text={mcpConfigJson}
                      size="sm"
                      variant="outline"
                      successMessage="Configuração mcpServers copiada"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        Instrução pronta para passar a outro agente
                      </span>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] font-mono text-muted-foreground">
                        {agentPrompt}
                      </pre>
                    </div>
                    <ClipboardButton
                      text={agentPrompt}
                      size="sm"
                      variant="outline"
                      successMessage="Instruções para agente copiadas"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        Teste rápido (curl)
                      </span>
                      <pre className="mt-1 overflow-x-auto text-[11px] font-mono text-muted-foreground">
                        {curlTest}
                      </pre>
                    </div>
                    <ClipboardButton
                      text={curlTest}
                      size="sm"
                      variant="outline"
                      successMessage="Comando curl copiado"
                    />
                  </div>
                </div>
              </div>
            )
          })()}

          {tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum token emitido.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((token) => {
                const isPat = token.kind === 'pat'
                const isExpired =
                  token.expires_at !== null && new Date(token.expires_at).getTime() < Date.now()
                const statusLabel = token.revoked_at ? 'Revogado' : isExpired ? 'Expirado' : 'Ativo'
                const expiryLabel = token.expires_at
                  ? `Expira em ${new Date(token.expires_at).toLocaleDateString('pt-BR')}`
                  : 'Sem expiração'

                return (
                  <li
                    key={token.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">
                          {token.label || token.client_id || 'Cliente OAuth'}
                        </span>
                        <Badge variant={isPat ? 'secondary' : 'outline'}>
                          {isPat ? 'Chave manual' : `OAuth · ${token.kind}`}
                        </Badge>
                        <Badge variant={token.revoked_at || isExpired ? 'outline' : 'default'}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{expiryLabel}</p>
                    </div>
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
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
