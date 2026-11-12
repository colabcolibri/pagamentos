'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X, XCircle } from 'lucide-react'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWebhooks } from '@/hooks/admin/use-webhooks'

const PAGE_SIZE_OPTIONS = [48, 96] as const

const PROVIDER_OPTIONS: FilterOption[] = [
  { value: 'pagarme', label: 'Pagar.me' },
  { value: 'asaas', label: 'Asaas' },
]

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'success', label: '✅ Sucesso' },
  { value: 'error', label: '❌ Erro' },
  { value: 'pending', label: '⏳ Pendente' },
  { value: 'received', label: '📥 Recebido' },
]

const CONTENT = {
  filters: {
    provider: { placeholder: 'Provider', empty: 'Nenhum provider' },
    status: { placeholder: 'Status', empty: 'Nenhum status' },
    eventType: 'Tipo de evento',
    clear: 'Limpar filtros',
  },
  pagination: {
    showing: 'Mostrando',
    of: 'de',
    results: 'resultados',
    perPage: 'Por página',
    previous: 'Anterior',
    next: 'Próxima',
    page: 'Página',
  },
  table: {
    id: 'ID',
    provider: 'Provider',
    event: 'Evento',
    status: 'Status',
    created: 'Recebido em',
    details: 'Detalhes',
  },
  details: {
    payload: 'Payload',
    headers: 'Headers',
    log: 'Log de processamento',
  },
  empty: {
    title: 'Nenhum webhook recebido',
    description: 'Os eventos aparecerão aqui quando os gateways enviarem notificações.',
  },
  error: {
    title: 'Erro ao carregar webhooks',
    description: 'Tente recarregar a página',
  },
} as const

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const str = useMemo(() => {
    if (data == null) return '—'
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }, [data])

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs font-mono break-all whitespace-pre-wrap">
        {str}
      </pre>
    </div>
  )
}

function WebhookRow({
  webhook,
  expanded,
  onToggle,
}: {
  webhook: {
    id: string
    provider: string
    event_type: string | null
    processing_status: string
    processing_log: string | null
    payload: Record<string, unknown> | null
    headers: Record<string, string> | null
    created_at: string
  }
  expanded: boolean
  onToggle: () => void
}) {
  const statusConfig: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
  > = {
    success: { variant: 'default', label: 'Sucesso' },
    error: { variant: 'destructive', label: 'Erro' },
    pending: { variant: 'secondary', label: 'Pendente' },
    received: { variant: 'outline', label: 'Recebido' },
  }
  const status = statusConfig[webhook.processing_status] ?? {
    variant: 'secondary' as const,
    label: webhook.processing_status || '—',
  }

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="w-8 py-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-24 inline-block">
            {webhook.id.slice(0, 8)}...
          </code>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {webhook.provider === 'pagarme' ? 'Pagar.me' : webhook.provider}
          </Badge>
        </TableCell>
        <TableCell>
          <code className="text-xs text-muted-foreground truncate max-w-32 md:max-w-48 block">
            {webhook.event_type || '—'}
          </code>
        </TableCell>
        <TableCell>
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {format(new Date(webhook.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
              <JsonBlock data={webhook.payload} label={CONTENT.details.payload} />
              <JsonBlock data={webhook.headers} label={CONTENT.details.headers} />
              <JsonBlock data={webhook.processing_log} label={CONTENT.details.log} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | 'ellipsis')[] = []
  const showLeft = currentPage > 3
  const showRight = currentPage < totalPages - 2
  pages.push(1)
  if (showLeft) pages.push('ellipsis')
  const start = showLeft ? Math.max(2, currentPage - 1) : 2
  const end = showRight ? Math.min(totalPages - 1, currentPage + 1) : totalPages - 1
  for (let i = start; i <= end; i++) {
    if (i !== 1 && i !== totalPages) pages.push(i)
  }
  if (showRight) pages.push('ellipsis')
  if (totalPages > 1) pages.push(totalPages)
  return pages
}

export function WebhooksTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(48)
  const [providerFilter, setProviderFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState('')

  const { data, isLoading, error } = useWebhooks({
    page,
    pageSize,
    provider: providerFilter,
    status: statusFilter,
    eventType: eventTypeFilter.trim() || null,
  })

  useEffect(() => {
    setPage(1)
  }, [providerFilter, statusFilter, eventTypeFilter])

  const webhooks = data?.webhooks ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const hasFilters = providerFilter || statusFilter || eventTypeFilter.trim()

  const clearFilters = useCallback(() => {
    setProviderFilter(null)
    setStatusFilter(null)
    setEventTypeFilter('')
    setPage(1)
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const startResult = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endResult = Math.min(page * pageSize, total)
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-xl border overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">{CONTENT.error.title}</h3>
        <p className="text-sm text-muted-foreground">{CONTENT.error.description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <FilterCombobox
            placeholder={CONTENT.filters.provider.placeholder}
            emptyText={CONTENT.filters.provider.empty}
            options={PROVIDER_OPTIONS}
            value={providerFilter}
            onValueChange={setProviderFilter}
          />
          <FilterCombobox
            placeholder={CONTENT.filters.status.placeholder}
            emptyText={CONTENT.filters.status.empty}
            options={STATUS_OPTIONS}
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
          <Input
            placeholder={CONTENT.filters.eventType}
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="w-full sm:w-48 h-9 text-sm"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {CONTENT.filters.clear}
            </Button>
          )}
        </div>
      </div>

      {webhooks.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 md:p-12 text-center">
          <div className="text-4xl mb-4">📡</div>
          <h3 className="font-semibold text-foreground mb-2">{CONTENT.empty.title}</h3>
          <p className="text-sm text-muted-foreground">{CONTENT.empty.description}</p>
        </div>
      ) : (
        <>
          <AdminTableWrapper aria-label="Lista de webhooks">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="w-28">{CONTENT.table.id}</TableHead>
                  <TableHead>{CONTENT.table.provider}</TableHead>
                  <TableHead>{CONTENT.table.event}</TableHead>
                  <TableHead>{CONTENT.table.status}</TableHead>
                  <TableHead>{CONTENT.table.created}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <WebhookRow
                    key={webhook.id}
                    webhook={webhook}
                    expanded={expandedId === webhook.id}
                    onToggle={() => toggleExpand(webhook.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </AdminTableWrapper>

          {total > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1 py-2">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {CONTENT.pagination.showing} {startResult}-{endResult} {CONTENT.pagination.of}{' '}
                  {total} {CONTENT.pagination.results}
                </p>
                <span className="text-sm text-muted-foreground">{CONTENT.pagination.perPage}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger size="sm" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Pagination className="overflow-x-auto max-w-full">
                <PaginationContent className="flex-wrap">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page > 1) setPage(page - 1)
                      }}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      aria-disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">{CONTENT.pagination.previous}</span>
                    </PaginationPrevious>
                  </PaginationItem>
                  {pageNumbers.map((n, i) =>
                    n === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={n}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setPage(n)
                          }}
                          isActive={page === n}
                          className="cursor-pointer min-w-9"
                        >
                          {n}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (page < totalPages) setPage(page + 1)
                      }}
                      className={
                        page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                      }
                      aria-disabled={page >= totalPages}
                    >
                      <span className="hidden sm:inline">{CONTENT.pagination.next}</span>
                      <ChevronRight className="h-4 w-4" />
                    </PaginationNext>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}
