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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type EmailLogListItem,
  useEmailLogDetail,
  useEmailLogs,
} from '@/hooks/admin/use-email-logs'

const PAGE_SIZE_OPTIONS = [48, 96] as const

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Falhou' },
  { value: 'sending', label: 'Enviando' },
]

const CONTENT = {
  filters: {
    status: { placeholder: 'Status', empty: 'Nenhum status' },
    search: 'Buscar por destinatário ou assunto',
    type: 'Tipo (metadata)',
    clear: 'Limpar filtros',
  },
  pagination: {
    showing: 'Mostrando',
    of: 'de',
    results: 'resultados',
    perPage: 'Por página',
    previous: 'Anterior',
    next: 'Próxima',
  },
  table: {
    id: 'ID',
    recipient: 'Destinatário',
    subject: 'Assunto',
    type: 'Tipo',
    status: 'Status',
    sentAt: 'Enviado em',
  },
  detail: {
    html: 'HTML',
    text: 'Texto',
    metadata: 'Metadados',
    error: 'Erro',
    noHtml: 'Nenhum HTML foi salvo para este envio.',
    noText: 'Nenhum texto foi salvo para este envio.',
    previewTitle: 'Pré-visualização do email',
  },
  empty: {
    title: 'Nenhum email registrado',
    description: 'Os envios aparecerão aqui após o sistema enviar mensagens.',
  },
  error: {
    title: 'Erro ao carregar emails',
    description: 'Tente recarregar a página',
  },
  loadDetailError: 'Não foi possível carregar o conteúdo do email.',
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
    <div className="space-y-1 min-w-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs font-mono break-all whitespace-pre-wrap">
        {str}
      </pre>
    </div>
  )
}

function EmailLogDetailPanel({ id }: { id: string }) {
  const { data, isLoading, error } = useEmailLogDetail(id)

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-[min(70vh,560px)] w-full rounded-md" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {CONTENT.loadDetailError}
      </p>
    )
  }

  const metaType =
    data.metadata && typeof data.metadata === 'object' && 'type' in data.metadata
      ? String((data.metadata as { type?: unknown }).type ?? '—')
      : '—'

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">De</dt>
          <dd className="font-medium break-all">
            {[data.from_name, data.from_email].filter(Boolean).join(' · ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Reply-to</dt>
          <dd className="break-all">{data.reply_to || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">{metaType}</code>
          </dd>
        </div>
        {data.order_id && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Pedido</dt>
            <dd>
              <code className="text-xs break-all">{data.order_id}</code>
            </dd>
          </div>
        )}
        {data.message_id && (
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-muted-foreground">Message id</dt>
            <dd className="break-all text-xs">{data.message_id}</dd>
          </div>
        )}
      </dl>

      <Tabs defaultValue="html" className="w-full min-w-0">
        <TabsList className="flex w-full flex-wrap h-auto gap-1 sm:flex-nowrap">
          <TabsTrigger value="html" className="flex-1 sm:flex-none">
            {CONTENT.detail.html}
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 sm:flex-none">
            {CONTENT.detail.text}
          </TabsTrigger>
          <TabsTrigger value="metadata" className="flex-1 sm:flex-none">
            {CONTENT.detail.metadata}
          </TabsTrigger>
          {data.status === 'failed' && data.error_message && (
            <TabsTrigger value="error" className="flex-1 sm:flex-none text-destructive">
              {CONTENT.detail.error}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="html" className="min-w-0 pt-2">
          {data.body_html ? (
            <iframe
              title={CONTENT.detail.previewTitle}
              sandbox=""
              className="h-[min(70vh,560px)] w-full max-w-full rounded-md border border-border bg-white dark:bg-white"
              srcDoc={data.body_html}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{CONTENT.detail.noHtml}</p>
          )}
        </TabsContent>
        <TabsContent value="text" className="min-w-0 pt-2">
          {data.body_text ? (
            <pre className="max-h-[min(70vh,560px)] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
              {data.body_text}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">{CONTENT.detail.noText}</p>
          )}
        </TabsContent>
        <TabsContent value="metadata" className="min-w-0 pt-2">
          <JsonBlock data={data.metadata} label={CONTENT.detail.metadata} />
        </TabsContent>
        {data.status === 'failed' && data.error_message ? (
          <TabsContent value="error" className="min-w-0 pt-2">
            <pre className="max-h-48 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs whitespace-pre-wrap break-words text-destructive">
              {data.error_message}
            </pre>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function EmailLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: EmailLogListItem
  expanded: boolean
  onToggle: () => void
}) {
  const statusConfig: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
  > = {
    success: { variant: 'default', label: 'Sucesso' },
    failed: { variant: 'destructive', label: 'Falhou' },
    sending: { variant: 'secondary', label: 'Enviando' },
  }
  const status = statusConfig[log.status] ?? {
    variant: 'outline' as const,
    label: log.status || '—',
  }

  const metaType =
    log.metadata && typeof log.metadata === 'object' && 'type' in log.metadata
      ? String((log.metadata as { type?: unknown }).type ?? '—')
      : '—'

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="w-8 py-2 align-middle">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </TableCell>
        <TableCell className="align-middle">
          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[4.5rem] sm:max-w-24 inline-block align-middle">
            {log.id.slice(0, 8)}…
          </code>
        </TableCell>
        <TableCell className="align-middle min-w-0 max-w-[140px] sm:max-w-[200px]">
          <span className="text-sm break-all line-clamp-2">{log.recipient}</span>
        </TableCell>
        <TableCell className="align-middle min-w-0 max-w-[160px] md:max-w-xs">
          <span className="text-sm text-muted-foreground break-words line-clamp-2">
            {log.subject}
          </span>
        </TableCell>
        <TableCell className="align-middle hidden md:table-cell min-w-0 max-w-[140px]">
          <code className="text-xs text-muted-foreground truncate block">{metaType}</code>
        </TableCell>
        <TableCell className="align-middle">
          <Badge variant={status.variant} className="text-xs shrink-0">
            {status.label}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground align-middle whitespace-nowrap">
          {log.created_at
            ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : '—'}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={7} className="p-4 min-w-0 max-w-[100vw] sm:max-w-none">
            <EmailLogDetailPanel id={log.id} />
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

export function EmailLogsTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(48)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [qFilter, setQFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, error } = useEmailLogs({
    page,
    pageSize,
    status: statusFilter,
    q: qFilter.trim() || null,
    type: typeFilter.trim() || null,
  })

  useEffect(() => {
    setPage(1)
  }, [statusFilter, qFilter, typeFilter])

  const logs = data?.emailLogs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const hasFilters = statusFilter || qFilter.trim() || typeFilter.trim()

  const clearFilters = useCallback(() => {
    setStatusFilter(null)
    setQFilter('')
    setTypeFilter('')
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
          <Skeleton className="h-9 w-48" />
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
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 w-full min-w-0">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <FilterCombobox
              placeholder={CONTENT.filters.status.placeholder}
              emptyText={CONTENT.filters.status.empty}
              options={STATUS_OPTIONS}
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </div>
          <Input
            placeholder={CONTENT.filters.search}
            value={qFilter}
            onChange={(e) => setQFilter(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md h-9 text-sm"
          />
          <Input
            placeholder={CONTENT.filters.type}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-48 h-9 text-sm"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="self-start sm:self-auto"
            >
              <X className="h-4 w-4 mr-1" />
              {CONTENT.filters.clear}
            </Button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 md:p-12 text-center">
          <div className="text-4xl mb-4" aria-hidden>
            ✉️
          </div>
          <h3 className="font-semibold text-foreground mb-2">{CONTENT.empty.title}</h3>
          <p className="text-sm text-muted-foreground">{CONTENT.empty.description}</p>
        </div>
      ) : (
        <>
          <AdminTableWrapper aria-label="Lista de emails enviados">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="w-28">{CONTENT.table.id}</TableHead>
                  <TableHead>{CONTENT.table.recipient}</TableHead>
                  <TableHead>{CONTENT.table.subject}</TableHead>
                  <TableHead className="hidden md:table-cell">{CONTENT.table.type}</TableHead>
                  <TableHead>{CONTENT.table.status}</TableHead>
                  <TableHead>{CONTENT.table.sentAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <EmailLogRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => toggleExpand(log.id)}
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

              <Pagination className="overflow-x-auto max-w-full justify-start sm:justify-end">
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
