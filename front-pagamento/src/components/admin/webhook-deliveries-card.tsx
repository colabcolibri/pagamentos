'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Filter, RefreshCw, Search, Send, X } from 'lucide-react'
import { toast } from 'sonner'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DeliveryItem {
  id: string
  event_id: string
  checkout_session_id: string | null
  order_id: string
  product_id: string
  product_name: string
  target_url: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  http_status: number | null
  last_error: string | null
  next_retry_at: string | null
  delivered_at: string | null
  created_at: string
  payload: Record<string, unknown> | null
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'delivered', label: '✅ Entregue' },
  { value: 'failed', label: '❌ Falhou' },
  { value: 'pending', label: '⏳ Pendente' },
]

const STATUS_BADGE: Record<
  DeliveryItem['status'],
  { variant: 'default' | 'destructive' | 'secondary'; label: string }
> = {
  delivered: { variant: 'default', label: 'Entregue' },
  failed: { variant: 'destructive', label: 'Falhou' },
  pending: { variant: 'secondary', label: 'Pendente' },
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return format(new Date(value), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
}

export function WebhookDeliveriesCard() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredDeliveries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return deliveries.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false
      if (!q) return true
      return (
        d.order_id.toLowerCase().includes(q) ||
        d.event_id.toLowerCase().includes(q) ||
        d.product_name.toLowerCase().includes(q) ||
        d.target_url.toLowerCase().includes(q) ||
        (d.last_error ?? '').toLowerCase().includes(q)
      )
    })
  }, [deliveries, statusFilter, searchQuery])

  const hasFilters = Boolean(statusFilter || searchQuery.trim())

  const clearFilters = useCallback(() => {
    setStatusFilter(null)
    setSearchQuery('')
  }, [])

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
        toast.error('Entrega registrada como falha. Expanda a linha para ver o motivo.')
      }
      await loadDeliveries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao disparar webhook')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>
          <FilterCombobox
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Status"
            emptyText="Nenhum status"
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por pedido, produto ou URL..."
              className="h-9 w-64 pl-8 text-sm"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredDeliveries.length} de {deliveries.length} entrega(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDeliveries()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleManualDispatch(e)}
        className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center"
      >
        <Input
          value={manualOrderId}
          onChange={(e) => setManualOrderId(e.target.value)}
          placeholder="UUID de pedido pago para registrar e disparar webhook manualmente"
          className="min-w-0 bg-background font-mono text-xs"
        />
        <Button type="submit" size="sm" disabled={dispatching || !manualOrderId.trim()}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {dispatching ? 'Disparando...' : 'Disparar por pedido'}
        </Button>
      </form>

      {loading ? (
        <div className="space-y-2 rounded-xl border p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="rounded-xl border py-12 text-center">
          <p className="font-medium">
            {hasFilters
              ? 'Nenhuma entrega encontrada para os filtros'
              : 'Nenhum webhook enviado ainda'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? 'Tente limpar os filtros ou buscar por outro termo.'
              : 'Quando um pagamento for confirmado, o disparo para a URL do produto aparecerá aqui.'}
          </p>
        </div>
      ) : (
        <AdminTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Pedido</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((d) => {
                const expanded = expandedId === d.id
                const badge = STATUS_BADGE[d.status]
                return (
                  <Fragment key={d.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expanded ? null : d.id)}
                    >
                      <TableCell className="w-8 py-2">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="inline-block max-w-28 truncate rounded bg-muted px-2 py-1 text-xs">
                          {d.order_id.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{d.product_name}</TableCell>
                      <TableCell>
                        <code className="block max-w-56 truncate text-xs text-muted-foreground">
                          {d.target_url}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {d.http_status && (
                            <span className="font-mono text-xs text-muted-foreground">
                              HTTP {d.http_status}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">({d.attempts}x)</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(d.delivered_at ?? d.created_at), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryingId === d.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleRetry(d.id)
                          }}
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          {retryingId === d.id ? 'Enviando...' : 'Reenviar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7} className="space-y-4 p-4">
                          <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <span className="text-muted-foreground">Pedido (order_id)</span>
                              <p className="mt-0.5 font-mono break-all">{d.order_id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Evento (event_id)</span>
                              <p className="mt-0.5 font-mono break-all">{d.event_id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Criado em</span>
                              <p className="mt-0.5">{formatDateTime(d.created_at)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Entregue em</span>
                              <p className="mt-0.5">{formatDateTime(d.delivered_at)}</p>
                            </div>
                          </div>
                          {d.last_error && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                              <strong>Último erro:</strong> {d.last_error}
                              {d.next_retry_at && (
                                <span className="ml-2 text-muted-foreground">
                                  (próximo retry: {formatDateTime(d.next_retry_at)})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Payload enviado
                            </span>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
                              {d.payload ? JSON.stringify(d.payload, null, 2) : '—'}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </AdminTableWrapper>
      )}
    </div>
  )
}
