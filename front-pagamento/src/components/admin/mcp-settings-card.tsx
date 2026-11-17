'use client'

import { useEffect, useState } from 'react'

import {
  BookOpen,
  KeyRound,
  Loader2,
  Plus,
  RotateCcw,
  Shield,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'

import { Dialog } from '@/components/layout/ui/dialog'
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

import { McpConnectionSnippets } from './mcp/mcp-connection-snippets'
import { McpPolicyMatrix, type PolicyMap, countEnabledModules } from './mcp/mcp-policy-matrix'

type PolicyView = {
  enabled: boolean
  policies: PolicyMap
}

type TokenRow = {
  id: string
  client_id: string | null
  kind: string
  label: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at?: string
  custom_policy?: PolicyMap | null
}

type CreatedTokenView = {
  id: string
  label: string
  token: string
  expires_at: string | null
}

function getTokenStatus(token: TokenRow) {
  const isExpired = token.expires_at !== null && new Date(token.expires_at).getTime() < Date.now()
  if (token.revoked_at) return { label: 'Revogado', active: false }
  if (isExpired) return { label: 'Expirado', active: false }
  return { label: 'Ativo', active: true }
}

function getExpiryLabel(expiresAt: string | null) {
  return expiresAt
    ? `Expira em ${new Date(expiresAt).toLocaleDateString('pt-BR')}`
    : 'Sem expiração'
}

export function McpSettingsCard() {
  const [policy, setPolicy] = useState<PolicyView | null>(null)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [mcpEndpoint, setMcpEndpoint] = useState('/api/mcp')

  // Dialog: padrão global / OAuth
  const [globalDialogOpen, setGlobalDialogOpen] = useState(false)
  const [globalDraft, setGlobalDraft] = useState<PolicyMap | null>(null)
  const [savingGlobal, setSavingGlobal] = useState(false)

  // Dialog: criar nova chave manual
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [tokenLabel, setTokenLabel] = useState('')
  const [expiresOption, setExpiresOption] = useState('90')
  const [creatingToken, setCreatingToken] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreatedTokenView | null>(null)

  // Dialog: editar permissões de uma chave manual
  const [editingToken, setEditingToken] = useState<TokenRow | null>(null)
  const [tokenPolicyDraft, setTokenPolicyDraft] = useState<PolicyMap | null>(null)
  const [savingTokenPolicy, setSavingTokenPolicy] = useState(false)

  // Dialog: instruções de conexão
  const [guideDialogOpen, setGuideDialogOpen] = useState(false)

  useEffect(() => {
    setMcpEndpoint(`${window.location.origin}/api/mcp`)
    void Promise.all([
      fetch('/api/admin/mcp-policy', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/admin/mcp-tokens', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([policyBody, tokenBody]) => {
      if (policyBody?.policies) setPolicy(policyBody as PolicyView)
      if (Array.isArray(tokenBody?.tokens)) setTokens(tokenBody.tokens as TokenRow[])
    })
  }, [])

  async function saveGlobalPolicy(next: PolicyView) {
    setSavingGlobal(true)
    const response = await fetch('/api/admin/mcp-policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    setSavingGlobal(false)
    if (!response.ok) {
      toast.error('Não foi possível salvar a política do MCP.')
      return false
    }
    setPolicy((await response.json()) as PolicyView)
    return true
  }

  async function handleToggleMaster(checked: boolean) {
    if (!policy) return
    const prev = policy
    setPolicy({ ...policy, enabled: checked })
    const ok = await saveGlobalPolicy({ ...policy, enabled: checked })
    if (!ok) setPolicy(prev)
  }

  async function handleSaveGlobalDialog() {
    if (!policy || !globalDraft) return
    const ok = await saveGlobalPolicy({ enabled: policy.enabled, policies: globalDraft })
    if (ok) {
      toast.success('Padrão global / OAuth atualizado.')
      setGlobalDialogOpen(false)
    }
  }

  async function handleCreateToken(event: React.FormEvent) {
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
        custom_policy: null,
      },
      ...current,
    ])
    setTokenLabel('')
    toast.success(`Chave "${generated.label}" gerada (herdando o padrão global).`)
  }

  function openTokenPermissions(token: TokenRow) {
    const base = token.custom_policy ?? policy?.policies ?? {}
    setTokenPolicyDraft(JSON.parse(JSON.stringify(base)) as PolicyMap)
    setEditingToken(token)
  }

  async function persistTokenPolicy(nextCustomPolicy: PolicyMap | null) {
    if (!editingToken) return
    setSavingTokenPolicy(true)
    const response = await fetch('/api/admin/mcp-tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingToken.id, customPolicy: nextCustomPolicy }),
    })
    setSavingTokenPolicy(false)
    if (!response.ok) {
      toast.error('Não foi possível salvar as permissões desta chave.')
      return
    }
    setTokens((current) =>
      current.map((item) =>
        item.id === editingToken.id ? { ...item, custom_policy: nextCustomPolicy } : item
      )
    )
    toast.success(
      nextCustomPolicy
        ? `Escopo próprio salvo para "${editingToken.label}".`
        : `"${editingToken.label}" voltou a herdar o padrão global.`
    )
    setEditingToken(null)
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
    toast.success('Acesso revogado.')
  }

  const manualTokens = tokens.filter((t) => t.kind === 'pat')
  const oauthTokens = tokens.filter((t) => t.kind !== 'pat')
  const enabledModulesCount = policy ? countEnabledModules(policy.policies) : 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>MCP (Model Context Protocol)</CardTitle>
              <CardDescription>
                Conecte assistentes externos via chaves manuais ou OAuth 2.1. Chaves manuais herdam
                o padrão global até você customizar o escopo individualmente.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setGuideDialogOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              Como conectar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!policy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {/* 1. Interruptor mestre + Padrão global / OAuth */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Interruptor mestre do MCP</span>
                    <p className="text-xs text-muted-foreground">
                      Quando desligado, bloqueia todas as chamadas (chaves manuais e OAuth).
                    </p>
                  </div>
                  <Switch
                    checked={policy.enabled}
                    onCheckedChange={(checked) => void handleToggleMaster(checked)}
                    aria-label="Ligar o MCP"
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Padrão global &amp; OAuth</span>
                      <Badge variant="secondary">
                        {enabledModulesCount} de {POLICY_KEYS.length} módulos
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aplicado a sessões OAuth e herdado por chaves manuais sem escopo próprio.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGlobalDraft(JSON.parse(JSON.stringify(policy.policies)) as PolicyMap)
                      setGlobalDialogOpen(true)
                    }}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Configurar
                  </Button>
                </div>
              </div>

              {/* Endpoint rápido */}
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3.5 py-2.5">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Endpoint MCP (HTTP JSON-RPC 2.0)
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

              {/* 2. Chaves manuais */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-4 w-4 text-primary" />
                      Chaves manuais (Agentes / API)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Crie uma chave nomeada e depois, se quiser, edite as permissões só daquela
                      chave.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCreatedToken(null)
                      setTokenLabel('')
                      setExpiresOption('90')
                      setCreateDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Nova chave
                  </Button>
                </div>

                {manualTokens.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Nenhuma chave manual gerada ainda.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {manualTokens.map((token) => {
                      const status = getTokenStatus(token)
                      const isCustom = Boolean(token.custom_policy)
                      const customCount = token.custom_policy
                        ? countEnabledModules(token.custom_policy)
                        : 0

                      return (
                        <li
                          key={token.id}
                          className="flex flex-col gap-3 rounded-lg border border-border/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">
                                {token.label || 'Chave sem nome'}
                              </span>
                              <Badge variant={isCustom ? 'secondary' : 'outline'}>
                                {isCustom ? `Escopo próprio (${customCount})` : 'Herdando padrão'}
                              </Badge>
                              <Badge variant={status.active ? 'default' : 'outline'}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getExpiryLabel(token.expires_at)}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!status.active}
                              onClick={() => openTokenPermissions(token)}
                            >
                              <Shield className="h-3.5 w-3.5" />
                              Permissões
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={Boolean(token.revoked_at)}
                              onClick={() => void revoke(token.id)}
                            >
                              Revogar
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* 3. Sessões via Autenticador (OAuth 2.1 + PKCE) */}
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Autenticador OAuth 2.1 (sessões dinâmicas)</p>
                  <p className="text-xs text-muted-foreground">
                    Clientes com suporte a OAuth autenticam usando o código de 6 dígitos enviado ao
                    seu e-mail de admin e recebem sempre o <strong>Padrão global</strong>{' '}
                    configurado acima.
                  </p>
                </div>

                {oauthTokens.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma sessão OAuth conectada no momento.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {oauthTokens.map((token) => {
                      const status = getTokenStatus(token)
                      return (
                        <li
                          key={token.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">
                                {token.client_id || 'Cliente OAuth'}
                              </span>
                              <Badge variant="outline">OAuth · {token.kind}</Badge>
                              <Badge variant={status.active ? 'default' : 'outline'}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getExpiryLabel(token.expires_at)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Padrão Global / OAuth */}
      <Dialog
        open={globalDialogOpen}
        onOpenChange={(open) => {
          if (!open) setGlobalDialogOpen(false)
        }}
        title="Padrão global &amp; OAuth"
        description="Define o que clientes OAuth podem fazer e serve de base dinâmica para chaves manuais sem escopo próprio."
        size="3xl"
        confirmText="Salvar padrão"
        cancelText="Cancelar"
        loading={savingGlobal}
        onConfirm={() => void handleSaveGlobalDialog()}
        onCancel={() => setGlobalDialogOpen(false)}
      >
        {globalDraft && <McpPolicyMatrix policies={globalDraft} onChange={setGlobalDraft} />}
      </Dialog>

      {/* Modal 2: Criar nova chave manual + exibir 1x */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCreateDialogOpen(false)
        }}
        title={createdToken ? `Chave gerada: ${createdToken.label}` : 'Nova chave MCP'}
        description={
          createdToken
            ? 'Copie agora. Por segurança, o token completo não será exibido novamente após fechar esta janela.'
            : 'A chave nasce herdando o padrão global. Depois de criada, você pode customizar as permissões só dela.'
        }
        size="2xl"
        footerContent={
          createdToken ? (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setCreateDialogOpen(false)}>
                Já copiei, fechar
              </Button>
            </div>
          ) : undefined
        }
      >
        {createdToken ? (
          <McpConnectionSnippets endpoint={mcpEndpoint} token={createdToken.token} />
        ) : (
          <form onSubmit={handleCreateToken} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-modal-label">Nome da chave</Label>
              <Input
                id="mcp-modal-label"
                placeholder="Ex.: Cursor MacBook, Claude Desktop, Agente Financeiro"
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
                maxLength={80}
                disabled={creatingToken}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-modal-expiry">Validade</Label>
              <Select
                value={expiresOption}
                onValueChange={(value) => setExpiresOption(value ?? '90')}
              >
                <SelectTrigger id="mcp-modal-expiry" className="w-full">
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creatingToken}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingToken || tokenLabel.trim().length < 2}>
                {creatingToken && <Loader2 className="h-4 w-4 animate-spin" />}
                Gerar chave
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Modal 3: Editar permissões de uma chave manual */}
      <Dialog
        open={Boolean(editingToken)}
        onOpenChange={(open) => {
          if (!open) setEditingToken(null)
        }}
        title={`Permissões: ${editingToken?.label ?? ''}`}
        description={
          editingToken?.custom_policy
            ? 'Esta chave está usando escopo próprio. Você pode editar abaixo ou voltar a herdar o padrão global.'
            : 'Esta chave está herdando o padrão global. Ao salvar alterações aqui, ela passa a ter escopo próprio.'
        }
        size="3xl"
        footerContent={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editingToken?.custom_policy ? (
              <Button
                type="button"
                variant="outline"
                disabled={savingTokenPolicy}
                onClick={() => void persistTokenPolicy(null)}
              >
                <RotateCcw className="h-4 w-4" />
                Voltar para padrão global
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingTokenPolicy}
                onClick={() => setEditingToken(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={savingTokenPolicy || !tokenPolicyDraft}
                onClick={() => void persistTokenPolicy(tokenPolicyDraft)}
              >
                {savingTokenPolicy && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar escopo próprio
              </Button>
            </div>
          </div>
        }
      >
        {tokenPolicyDraft && (
          <McpPolicyMatrix policies={tokenPolicyDraft} onChange={setTokenPolicyDraft} />
        )}
      </Dialog>

      {/* Modal 4: Como conectar agentes */}
      <Dialog
        open={guideDialogOpen}
        onOpenChange={(open) => {
          if (!open) setGuideDialogOpen(false)
        }}
        title="Como conectar agentes e clientes MCP"
        description="Use uma chave manual gerada no painel ou o fluxo OAuth 2.1 + PKCE."
        size="2xl"
        footerContent={
          <div className="flex justify-end">
            <Button type="button" onClick={() => setGuideDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        <McpConnectionSnippets endpoint={mcpEndpoint} />
      </Dialog>
    </>
  )
}
