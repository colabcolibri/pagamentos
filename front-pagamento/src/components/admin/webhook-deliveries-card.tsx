'use client'

import { useCallback, useEffect, useState } from 'react'

import { RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DeliveryItem {
  id: string
  event_id: string
  product_name: string
  target_url: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  http_status: number | null
  last_error: string | null
  created_at: string
}

export function WebhookDeliveriesCard() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Entregas Outbound (Checkout Sessions)</CardTitle>
          <CardDescription>
            Notificações enviadas pelo Quitou aos sistemas integrados com assinatura HMAC-SHA256.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadDeliveries()}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
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
                <div className="min-w-0 space-y-0.5">
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
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">{d.target_url}</p>
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
