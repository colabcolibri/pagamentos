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

const LABELS: Record<(typeof POLICY_KEYS)[number], string> = {
  identidade: 'Identidade',
  produto: 'Produtos',
  ia: 'IA',
  pedido: 'Pedidos',
  pagamento: 'Pagamentos',
  cupom: 'Cupons',
  assinatura: 'Assinaturas',
  email: 'E-mails',
  admin: 'Admins',
  config: 'Chaves',
  webhook: 'Webhooks recebidos',
  auditoria: 'Auditoria',
  reembolso: 'Reembolso',
  conexao: 'Conexões',
  resumo: 'Resumo',
}

const ACTION_LABELS: { key: keyof Actions; label: string }[] = [
  { key: 'read', label: 'Ler' },
  { key: 'upsert', label: 'Gravar' },
  { key: 'delete', label: 'Apagar' },
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
        <CardTitle>MCP do admin</CardTitle>
        <CardDescription>
          O cliente entra com o mesmo código de e-mail. O interruptor mestre começa desligado e
          apagar também. O token revogado falha na próxima chamada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!policy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">MCP ligado</span>
              <Switch
                checked={policy.enabled}
                disabled={saving}
                onCheckedChange={(checked) => void save({ ...policy, enabled: checked })}
                aria-label="Ligar o MCP"
              />
            </div>
            <div className="grid gap-3">
              {POLICY_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">{LABELS[key]}</span>
                  <div className="flex flex-wrap gap-3">
                    {ACTION_LABELS.map((action) => (
                      <label key={action.key} className="flex items-center gap-2 text-sm">
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
              ))}
            </div>
          </>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tokens deste admin</p>
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
