'use client'

import { useMemo, useState } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, X } from 'lucide-react'

import { AppDataTable } from '@/components/admin/app-data-table'
import { Sheet } from '@/components/layout/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyableText } from '@/components/ui/clipboard-button'
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
  sheet: {
    title: 'Detalhes da assinatura',
    subtitle: 'Informações completas da assinatura e ciclo de cobrança',
    status: 'Status',
    customer: 'Cliente',
    email: 'E-mail',
    product: 'Produto',
    amount: 'Valor',
    period: 'Período atual',
    cancelAtEnd: 'Cancelar ao fim do período',
    yes: 'Sim',
    no: 'Não',
    canceledAt: 'Cancelada em',
    createdAt: 'Criada em',
    subId: 'ID da assinatura',
    userId: 'ID do usuário',
    priceId: 'ID do preço',
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
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
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
    <>
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
        onRowClick={(row) => setSelectedSub(row)}
        getRowId={(row) => row.id}
        pagination={{
          page,
          pageSize: limit,
          total,
          totalPages,
          onPageChange: setPage,
        }}
      />

      <Sheet
        open={selectedSub !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSub(null)
        }}
        title={CONTENT.sheet.title}
        description={
          selectedSub
            ? selectedSub.prices?.products?.name || `#${selectedSub.id.slice(0, 8)}`
            : CONTENT.sheet.subtitle
        }
        size="md"
        hideFooter
      >
        {selectedSub && (
          <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.status}</dt>
              <dd>
                <Badge variant={getStatusBadgeVariant(selectedSub.status)}>
                  {CONTENT.status[selectedSub.status] || selectedSub.status}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.customer}</dt>
              <dd className="text-right font-medium">{selectedSub.profiles?.name || '—'}</dd>
            </div>
            {selectedSub.profiles?.email && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.email}</dt>
                <dd className="text-right text-xs">{selectedSub.profiles.email}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.product}</dt>
              <dd className="text-right font-medium">
                {selectedSub.prices?.products?.name || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.amount}</dt>
              <dd className="font-mono font-semibold tabular-nums">
                {selectedSub.prices
                  ? formatCurrency(selectedSub.prices.amount, selectedSub.prices.currency)
                  : '—'}
              </dd>
            </div>
            {selectedSub.current_period_start && selectedSub.current_period_end && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.period}</dt>
                <dd className="tabular-nums text-xs">
                  {formatDate(selectedSub.current_period_start)} –{' '}
                  {formatDate(selectedSub.current_period_end)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.cancelAtEnd}</dt>
              <dd>{selectedSub.cancel_at_period_end ? CONTENT.sheet.yes : CONTENT.sheet.no}</dd>
            </div>
            {selectedSub.canceled_at && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.canceledAt}</dt>
                <dd className="tabular-nums text-xs">
                  {new Date(selectedSub.canceled_at).toLocaleString('pt-BR')}
                </dd>
              </div>
            )}
            {selectedSub.created_at && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.createdAt}</dt>
                <dd className="tabular-nums text-xs">
                  {new Date(selectedSub.created_at).toLocaleString('pt-BR')}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.subId}</dt>
              <dd>
                <CopyableText text={selectedSub.id} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.userId}</dt>
              <dd>
                <CopyableText text={selectedSub.user_id} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.priceId}</dt>
              <dd>
                <CopyableText text={selectedSub.price_id} />
              </dd>
            </div>
          </dl>
        )}
      </Sheet>
    </>
  )
}
