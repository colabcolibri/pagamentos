'use client'

import { useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X, XCircle } from 'lucide-react'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Subscription, SubscriptionStatus } from '@/hooks/admin/use-subscriptions'
import { useSubscriptions } from '@/hooks/admin/use-subscriptions'

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'incomplete', label: '⏳ Incompleta' },
  { value: 'active', label: '✅ Ativa' },
  { value: 'past_due', label: '⚠️ Atrasada' },
  { value: 'canceled', label: '❌ Cancelada' },
  { value: 'unpaid', label: '💳 Não paga' },
]

const CONTENT = {
  filters: {
    status: {
      placeholder: 'Status',
      empty: 'Nenhum status encontrado',
    },
    clear: 'Limpar filtros',
  },
  pagination: {
    showing: 'Mostrando',
    of: 'de',
    results: 'resultados',
    previous: 'Anterior',
    next: 'Próxima',
    page: 'Página',
  },
  table: {
    id: 'ID',
    customer: 'Cliente',
    product: 'Produto',
    amount: 'Valor',
    status: 'Status',
    period: 'Período',
    cancelAtEnd: 'Cancela no fim',
    created: 'Criado',
    noData: 'Nenhuma assinatura encontrada',
  },
  status: {
    incomplete: 'Incompleta',
    active: 'Ativa',
    past_due: 'Atrasada',
    canceled: 'Cancelada',
    unpaid: 'Não paga',
  },
} as const

function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatusBadgeVariant(
  status: SubscriptionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'past_due':
      return 'destructive'
    case 'canceled':
      return 'secondary'
    case 'unpaid':
      return 'destructive'
    case 'incomplete':
    default:
      return 'outline'
  }
}

export function SubscriptionsTable() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | undefined>()
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, error } = useSubscriptions({
    status: statusFilter,
    includeRelations: true,
    limit,
    offset: page * limit,
  })

  const subscriptions = data?.subscriptions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const hasFilters = !!statusFilter

  const clearFilters = () => {
    setStatusFilter(undefined)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterCombobox
          options={STATUS_OPTIONS}
          value={statusFilter ?? null}
          onValueChange={(value) => {
            setStatusFilter((value as SubscriptionStatus) || undefined)
            setPage(0)
          }}
          placeholder={CONTENT.filters.status.placeholder}
          emptyText={CONTENT.filters.status.empty}
        />

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            {CONTENT.filters.clear}
          </Button>
        )}
      </div>

      {/* Tabela */}
      <AdminTableWrapper aria-label="Lista de assinaturas">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{CONTENT.table.id}</TableHead>
              <TableHead>{CONTENT.table.customer}</TableHead>
              <TableHead>{CONTENT.table.product}</TableHead>
              <TableHead>{CONTENT.table.amount}</TableHead>
              <TableHead>{CONTENT.table.status}</TableHead>
              <TableHead>{CONTENT.table.period}</TableHead>
              <TableHead>{CONTENT.table.cancelAtEnd}</TableHead>
              <TableHead>{CONTENT.table.created}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="p-8 md:p-12 text-center border-t border-destructive/20 bg-destructive/10"
                >
                  <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-sm font-medium text-destructive">
                    Erro ao carregar assinaturas
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Tente recarregar a página</p>
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-8 md:p-12 text-center">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="text-sm font-medium text-foreground">{CONTENT.table.noData}</p>
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription: Subscription) => {
                const price = subscription.prices
                const product = price?.products
                const profile = subscription.profiles

                return (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-mono text-xs">
                      {subscription.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{profile?.name || '-'}</span>
                        <span className="text-xs text-muted-foreground">
                          {profile?.email || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{product?.name || '-'}</TableCell>
                    <TableCell>
                      {price ? formatCurrency(price.amount, price.currency) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(subscription.status)}>
                        {CONTENT.status[subscription.status] || subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {subscription.current_period_start && subscription.current_period_end ? (
                        <div className="flex flex-col text-xs">
                          <span>{formatDate(subscription.current_period_start)}</span>
                          <span className="text-muted-foreground">
                            até {formatDate(subscription.current_period_end)}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.cancel_at_period_end ? (
                        <Badge variant="outline">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.created_at
                        ? formatDistanceToNow(new Date(subscription.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </AdminTableWrapper>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {CONTENT.pagination.showing} {page * limit + 1} - {Math.min((page + 1) * limit, total)}{' '}
            {CONTENT.pagination.of} {total} {CONTENT.pagination.results}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {CONTENT.pagination.previous}
            </Button>
            <span className="text-sm text-muted-foreground">
              {CONTENT.pagination.page} {page + 1} {CONTENT.pagination.of} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              {CONTENT.pagination.next}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
