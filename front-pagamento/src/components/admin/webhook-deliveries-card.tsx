'use client'

import { useCallback, useEffect, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface DeliveryItem {
  id: string
  event_id: string
  order_id: string
  product_name: string
  target_url: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  http_status: number | null
  last_error: string | null
  delivered_at: string | null
  created_at: string
}

export function WebhookDeliveriesCard() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [manualOrderId, setManualOrderId] = useState('')
  const [dispatching, setDispatching] = useState(false)

  const loadDeliveries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/webhook-deliveries')
      if (!res.ok) throw new Error('Falha ao carregar entregas outbound')
      const json = (await res.json()) as { deliveries?: DeliveryItem[] }
      setDeliveries(json.deliveries ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar entregas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDeliveries()
  }, [loadDeliveries])

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      const res = await fetch(`/api/admin/webhook-deliveries/${id}/retry`, { method: 'POST' })
      const json = (await res.json()) as { delivered?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao reenviar')
      if (json.delivered) {
        toast.success('Webhook reenviado e entregue com sucesso.')
      } else {
        toast.error(
          json.error ? `Falha no reenvio: ${json.error}` : 'O destino ainda retornou erro.'
        )
      }
      await loadDeliveries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao reenviar')
    } finally {
      setRetryingId(null)
    }
  }

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    const orderId = manualOrderId.trim()
    if (!orderId) return

    setDispatching(true)
    try {
      const res = await fetch('/api/admin/webhook-deliveries/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const json = (await res.json()) as {
        delivered?: boolean
        error?: string
        reason?: string
      }
      if (!res.ok) {
        throw new Error(json.error ?? json.reason ?? 'Erro ao disparar webhook')
      }
      if (json.delivered) {
        toast.success('Webhook registrado e entregue com sucesso.')
        setManualOrderId('')
      } else {
        toast.error(
          'Entrega registrada como falha. Veja o motivo na lista abaixo e tente reenviar.'
        )
      }
      await loadDeliveries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao disparar webhook')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Webhooks Enviados (Meu sistema)</CardTitle>
          <CardDescription>
            Notificações de pagamento confirmado enviadas pelo Quitou para a URL do produto, com
            assinatura HMAC-SHA256 e reenvio manual.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadDeliveries()}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => void handleManualDispatch(e)}
          className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center"
        >
          <Input
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            placeholder="UUID do pedido pago para registrar/disparar webhook manualmente"
            className="min-w-0 font-mono text-xs"
          />
          <Button type="submit" size="sm" disabled={dispatching || !manualOrderId.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {dispatching ? 'Disparando...' : 'Disparar por pedido'}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando entregas...</p>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma entrega outbound registrada ainda.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.product_name}</span>
                    <Badge
                      variant={
                        d.status === 'delivered'
                          ? 'default'
                          : d.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {d.status}
                    </Badge>
                    {d.http_status && (
                      <span className="font-mono text-xs text-muted-foreground">
                        HTTP {d.http_status}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{d.attempts} tentativa(s)</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.delivered_at ?? d.created_at), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">{d.target_url}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    Pedido: {d.order_id} · Evento: {d.event_id}
                  </p>
                  {d.last_error && <p className="text-xs text-destructive">{d.last_error}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={retryingId === d.id}
                  onClick={() => void handleRetry(d.id)}
                  className="shrink-0"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {retryingId === d.id ? 'Enviando...' : 'Reenviar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
