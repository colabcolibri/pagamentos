'use client'

import { useCallback, useEffect, useState } from 'react'

import { Ban, Copy, KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { CheckoutApiKeyPublic } from '@/lib/checkout-sessions/types'

export function CheckoutKeysCard() {
  const [keys, setKeys] = useState<CheckoutApiKeyPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/checkout-keys')
      if (!res.ok) throw new Error('Falha ao carregar chaves')
      const json = (await res.json()) as { keys?: CheckoutApiKeyPublic[] }
      setKeys(json.keys ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar chaves')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKeys()
  }, [loadKeys])

  const handleCreate = async () => {
    const trimmed = label.trim()
    if (trimmed.length < 2) {
      toast.error('Informe um rótulo com pelo menos 2 caracteres.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/checkout-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      })
      const json = (await res.json()) as {
        key?: CheckoutApiKeyPublic
        secret?: string
        error?: string
      }
      if (!res.ok || !json.secret) {
        throw new Error(json.error ?? 'Erro ao criar chave')
      }
      setNewSecret(json.secret)
      setLabel('')
      await loadKeys()
      toast.success('Chave S2S criada. Copie o segredo agora — ele não será exibido novamente.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar chave')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/checkout-keys/${id}/revoke`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao revogar chave')
      await loadKeys()
      toast.success('Chave revogada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar chave')
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <KeyRound className="h-5 w-5 shrink-0" />
          Chaves de Checkout S2S
        </CardTitle>
        <CardDescription className="max-w-2xl">
          Emita chaves para sistemas externos criarem sessões de pagamento autenticadas em{' '}
          <code>POST /api/v1/checkout/sessions</code>. O segredo completo é exibido apenas uma vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Ex.: Sistema Externo Produção"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
          <Button onClick={handleCreate} disabled={creating} className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" />
            {creating ? 'Gerando...' : 'Gerar chave S2S'}
          </Button>
        </div>

        {newSecret && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
            <p className="font-medium text-amber-700 dark:text-amber-300">
              Copie esta chave agora — ela não poderá ser recuperada depois:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-xs">
                {newSecret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(newSecret)
                  toast.success('Chave copiada.')
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando chaves...</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma chave S2S emitida.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {keys.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.label}</span>
                    <Badge variant={item.revokedAt ? 'secondary' : 'default'}>
                      {item.revokedAt ? 'Revogada' : 'Ativa'}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.keyPrefix}••••••••
                  </p>
                </div>
                {!item.revokedAt && (
                  <Button variant="ghost" size="sm" onClick={() => void handleRevoke(item.id)}>
                    <Ban className="mr-1 h-3.5 w-3.5" />
                    Revogar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
