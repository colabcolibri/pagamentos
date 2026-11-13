'use client'

import { useMemo, useState } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, X } from 'lucide-react'

import { AppDataTable } from '@/components/admin/app-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'
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
  empty: {
    title: 'Nenhuma assinatura encontrada',
    description: 'Não há assinaturas cadastradas para o filtro selecionado.',
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
    case 'unpaid':
      return 'destructive'
    case 'canceled':
      return 'secondary'
    case 'incomplete':
    default:
      return 'outline'
  }
}

export function SubscriptionsTable() {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | undefined>()
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useSubscriptions({
    status: statusFilter,
    includeRelations: true,
    limit,
    offset: (page - 1) * limit,
  })

  const subscriptions = data?.subscriptions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const columns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {row.original.id.slice(0, 8)}...
          </code>
        ),
      },
      {
        id: 'customer',
        header: 'Cliente',
        cell: ({ row }) => {
          const profile = row.original.profiles
          return (
            <div className="flex flex-col min-w-0 max-w-[220px]">
              <span className="font-medium text-sm truncate">{profile?.name || '-'}</span>
              <span className="text-xs text-muted-foreground truncate">
                {profile?.email || '-'}
              </span>
            </div>
          )
        },
      },
      {
        id: 'product',
        header: 'Produto',
        cell: ({ row }) => (
          <span className="font-medium text-sm block max-w-[200px] truncate">
            {row.original.prices?.products?.name || '-'}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Valor',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right font-mono font-semibold tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) => {
          const price = row.original.prices
          return price ? formatCurrency(price.amount, price.currency) : '-'
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant={getStatusBadgeVariant(row.original.status)}>
            {CONTENT.status[row.original.status] || row.original.status}
          </Badge>
        ),
      },
      {
        id: 'period',
        header: 'Período',
        meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
        cell: ({ row }) =>
          row.original.current_period_start && row.original.current_period_end ? (
            <div className="flex flex-col text-xs">
              <span>{formatDate(row.original.current_period_start)}</span>
              <span className="text-muted-foreground">
                até {formatDate(row.original.current_period_end)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'cancel_at_period_end',
        header: 'Cancela no fim',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.cancel_at_period_end ? (
            <Badge variant="outline">Sim</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">Não</span>
          ),
      },
      {
        accessorKey: 'created_at',
        header: 'Criado',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) =>
          row.original.created_at
            ? formatDistanceToNow(new Date(row.original.created_at), {
                addSuffix: true,
                locale: ptBR,
              })
            : '—',
      },
    ],
    []
  )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterCombobox
        placeholder={CONTENT.filters.status.placeholder}
        emptyText={CONTENT.filters.status.empty}
        options={STATUS_OPTIONS}
        value={statusFilter ?? null}
        onValueChange={(value) => {
          setStatusFilter((value as SubscriptionStatus | null) ?? undefined)
          setPage(1)
        }}
      />
      {statusFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStatusFilter(undefined)
            setPage(1)
          }}
        >
          <X className="size-4" />
          {CONTENT.filters.clear}
        </Button>
      )}
    </div>
  )

  return (
    <AppDataTable
      ariaLabel="Lista de assinaturas"
      columns={columns}
      data={subscriptions}
      isLoading={isLoading}
      error={
        error ? (error instanceof Error ? error.message : 'Erro ao carregar assinaturas') : null
      }
      errorTitle="Erro ao carregar assinaturas"
      emptyIcon={<Activity className="size-10 text-muted-foreground/60" />}
      emptyTitle={CONTENT.empty.title}
      emptyDescription={CONTENT.empty.description}
      toolbar={toolbar}
      getRowId={(row) => row.id}
      pagination={{
        page,
        pageSize: limit,
        total,
        totalPages,
        onPageChange: setPage,
      }}
    />
  )
}
