'use client'

import { useCallback, useEffect, useState } from 'react'

import { CheckCircle2, DatabaseZap, Loader2, Lock, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface DevSeedSummary {
  products: number
  prices: number
  coupons: number
  customers: number
  orders: number
  paidOrders: number
  subscriptions: number
  asaasPayments: number
  pagarmePayments: number
  couponRedemptions: number
  webhooks: number
  emailsSent: number
  emailsFailed: number
}

interface DevSeedHealthCheckItem {
  id: string
  label: string
  ok: boolean
  detail: string
}

interface DevSeedHealth {
  ok: boolean
  checkedAt: string
  checks: DevSeedHealthCheckItem[]
}

interface DevSeedStatusResponse {
  enabled: boolean
  executed: boolean
  executedAt: string | null
  summary: DevSeedSummary | null
  health: DevSeedHealth | null
}

const CONTENT = {
  title: 'Carga inicial de desenvolvimento',
  description:
    'Limpa os dados de exemplo anteriores e popula do zero um cenário completo para testes (15 produtos, preços, políticas, 6 cupons, 30 clientes, 100 pedidos com pagamentos, assinaturas, webhooks e e-mails no Mailpit). Execução única por banco.',
  badges: {
    pending: 'Pronta para executar',
    blocked: 'Estrutura pendente',
    executed: 'Executada',
  },
  button: {
    run: 'Executar carga inicial',
    running: 'Executando carga…',
    done: 'Carga já executada',
    recheck: 'Reverificar',
  },
  healthSectionTitle: 'Health check do banco e estrutura',
  confirm: {
    title: 'Executar carga inicial de desenvolvimento?',
    description:
      'Esta ação apaga os produtos, cupons, clientes não-admin, pedidos, pagamentos, assinaturas, webhooks e logs atuais para recriar tudo do zero. Só pode ser executada uma única vez.',
    confirmText: 'Sim, executar carga',
    cancelText: 'Cancelar',
  },
  stats: [
    { key: 'products', label: 'Produtos' },
    { key: 'coupons', label: 'Cupons' },
    { key: 'customers', label: 'Clientes' },
    { key: 'orders', label: 'Pedidos' },
    { key: 'subscriptions', label: 'Assinaturas' },
    { key: 'emailsSent', label: 'E-mails enviados' },
  ] as const,
  executedAtPrefix: 'Executada em',
  toast: {
    success: 'Carga inicial executada com sucesso!',
    error: 'Erro ao executar carga inicial.',
  },
} as const

export function DevSeedCard() {
  const [status, setStatus] = useState<DevSeedStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [rechecking, setRechecking] = useState(false)
  const [running, setRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchStatus = useCallback(async (isRecheck = false) => {
    if (isRecheck) setRechecking(true)
    try {
      const res = await fetch('/api/admin/dev-seed')
      if (!res.ok) return
      const data: DevSeedStatusResponse = await res.json()
      setStatus(data)
    } catch {
      // silencioso no carregamento inicial
    } finally {
      setLoading(false)
      setRechecking(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus(false)
  }, [fetchStatus])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
      </Card>
    )
  }

  if (!status?.enabled) {
    return null
  }

  const healthOk = status.health?.ok ?? false

  async function handleRun() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/dev-seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (data.health) {
          setStatus((prev) => (prev ? { ...prev, health: data.health } : prev))
        }
        throw new Error(data.error || CONTENT.toast.error)
      }
      setStatus((prev) => ({
        enabled: true,
        executed: true,
        executedAt: data.executedAt,
        summary: data.summary,
        health: prev?.health ?? null,
      }))
      toast.success(CONTENT.toast.success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : CONTENT.toast.error)
    } finally {
      setRunning(false)
    }
  }

  const formattedDate = status.executedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(status.executedAt))
    : null

  const badgeLabel = status.executed
    ? CONTENT.badges.executed
    : healthOk
      ? CONTENT.badges.pending
      : CONTENT.badges.blocked

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          {/* Linha 1: Título + Badge à esquerda, Botão à direita */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <DatabaseZap className="h-5 w-5 shrink-0 text-foreground" />
              <CardTitle>{CONTENT.title}</CardTitle>
              <Badge variant={status.executed ? 'secondary' : healthOk ? 'outline' : 'destructive'}>
                {badgeLabel}
              </Badge>
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={status.executed || running || !healthOk}
              variant={status.executed ? 'outline' : 'default'}
              className="w-full shrink-0 sm:w-auto"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {CONTENT.button.running}
                </>
              ) : status.executed ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {CONTENT.button.done}
                </>
              ) : (
                <>
                  <DatabaseZap className="mr-2 h-4 w-4" />
                  {CONTENT.button.run}
                </>
              )}
            </Button>
          </div>

          {/* Linha 2: Texto ocupando toda a largura abaixo */}
          <div className="space-y-1.5">
            <CardDescription className="w-full">{CONTENT.description}</CardDescription>
            {status.executed && formattedDate ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                {CONTENT.executedAtPrefix} {formattedDate}
              </p>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status.health ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {CONTENT.healthSectionTitle}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => fetchStatus(true)}
                  disabled={rechecking || running}
                >
                  <RefreshCw className={`mr-1.5 h-3 w-3 ${rechecking ? 'animate-spin' : ''}`} />
                  {CONTENT.button.recheck}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {status.health.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-2.5 rounded-lg border bg-muted/20 px-3 py-2.5"
                  >
                    {check.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {status.executed && status.summary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CONTENT.stats.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border bg-muted/30 px-3 py-2.5 text-center"
                >
                  <div className="text-lg font-semibold tabular-nums">
                    {status.summary?.[item.key] ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={CONTENT.confirm.title}
        description={CONTENT.confirm.description}
        confirmText={CONTENT.confirm.confirmText}
        cancelText={CONTENT.confirm.cancelText}
        variant="destructive"
        onConfirm={handleRun}
      />
    </>
  )
}
