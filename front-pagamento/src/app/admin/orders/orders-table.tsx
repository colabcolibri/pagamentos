'use client'

import { useMemo, useState } from 'react'

import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Filter, Package, X } from 'lucide-react'

import { AppDataTable } from '@/components/admin/app-data-table'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterCombobox, type FilterOption } from '@/components/ui/filter-combobox'

import { OrderDetailsDialog } from './order-details-dialog'
import type { Order } from './types'
import { type FetchOrdersParams, useOrders } from './use-orders'

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'pending', label: '⏳ Pendente' },
  { value: 'paid', label: '✅ Pago' },
  { value: 'expired', label: '⌛ Expirado' },
  { value: 'cancelled', label: '❌ Cancelado' },
]

const GATEWAY_OPTIONS: FilterOption[] = [
  { value: 'pagarme', label: 'Pagar.me' },
  { value: 'asaas', label: 'Asaas' },
]

const METHOD_OPTIONS: FilterOption[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'boleto_parcelado', label: 'Boleto Parcelado' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
]

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'one_time', label: 'Pagamento único' },
  { value: 'subscription', label: 'Assinatura' },
]

const CONTENT = {
  filters: {
    status: { placeholder: 'Status', empty: 'Nenhum status encontrado' },
    gateway: { placeholder: 'Gateway', empty: 'Nenhum gateway encontrado' },
    method: { placeholder: 'Método', empty: 'Nenhum método encontrado' },
    type: { placeholder: 'Tipo', empty: 'Nenhum tipo encontrado' },
    clear: 'Limpar filtros',
  },
  gateway: {
    pagarme: 'Pagar.me',
    asaas: 'Asaas',
  },
  empty: {
    title: 'Nenhum pedido encontrado',
    description: 'Não há pedidos cadastrados para os filtros selecionados.',
  },
  error: {
    title: 'Erro ao carregar pedidos',
    description: 'Tente recarregar a página',
  },
} as const

type OrderRow = NonNullable<ReturnType<typeof useOrders>['data']>['orders'][number]

function formatPrice(cents: number, currency: string = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

export function OrdersTable() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState<FetchOrdersParams>({
    page: 1,
    pageSize: 20,
  })

  const { data, isLoading, error } = useOrders(filters)

  const hasActiveFilters =
    !!filters.status || !!filters.gateway || !!filters.paymentMethod || !!filters.orderType

  const clearFilters = () => {
    setFilters({ page: 1, pageSize: 20 })
  }

  const updateFilter = (key: keyof FetchOrdersParams, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }))
  }

  const openOrder = (order: OrderRow) => {
    setSelectedOrder({
      ...order,
      created_at: order.created_at || '',
      updated_at: order.updated_at || '',
    })
  }

  const columns = useMemo<ColumnDef<OrderRow>[]>(
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
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 max-w-[220px]">
            <span className="font-medium text-sm truncate">
              {row.original.profiles?.name || 'Sem nome'}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {row.original.profiles?.email}
            </span>
          </div>
        ),
      },
      {
        id: 'product',
        header: 'Produto',
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 max-w-[220px]">
            <span className="font-medium text-sm truncate">{row.original.products?.name}</span>
            <code className="text-xs text-muted-foreground truncate">
              {row.original.products?.ref}
            </code>
          </div>
        ),
      },
      {
        accessorKey: 'amount_cents',
        header: 'Valor',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right font-mono font-semibold tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) =>
          formatPrice(row.original.amount_cents, row.original.prices?.currency ?? 'BRL'),
      },
      {
        accessorKey: 'payment_method',
        header: 'Método',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.payment_method ? (
            <Badge variant="outline" className="text-xs">
              {row.original.payment_method}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'payment_gateway',
        header: 'Gateway',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {CONTENT.gateway[row.original.payment_gateway]}
          </Badge>
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
      {
        id: 'actions',
        header: 'Ações',
        meta: {
          headerClassName: 'text-right w-16',
          cellClassName: 'text-right whitespace-nowrap',
        },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ver detalhes do pedido"
            onClick={(e) => {
              e.stopPropagation()
              openOrder(row.original)
            }}
          >
            <Eye className="size-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const orders = data?.orders || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.pageSize || 20
  const totalPages = data?.totalPages || 0

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="size-4 text-muted-foreground shrink-0" />
      <FilterCombobox
        placeholder={CONTENT.filters.status.placeholder}
        emptyText={CONTENT.filters.status.empty}
        options={STATUS_OPTIONS}
        value={filters.status || null}
        onValueChange={(value) => updateFilter('status', value)}
      />
      <FilterCombobox
        placeholder={CONTENT.filters.gateway.placeholder}
        emptyText={CONTENT.filters.gateway.empty}
        options={GATEWAY_OPTIONS}
        value={filters.gateway || null}
        onValueChange={(value) => updateFilter('gateway', value)}
      />
      <FilterCombobox
        placeholder={CONTENT.filters.method.placeholder}
        emptyText={CONTENT.filters.method.empty}
        options={METHOD_OPTIONS}
        value={filters.paymentMethod || null}
        onValueChange={(value) => updateFilter('paymentMethod', value)}
      />
      <FilterCombobox
        placeholder={CONTENT.filters.type.placeholder}
        emptyText={CONTENT.filters.type.empty}
        options={TYPE_OPTIONS}
        value={filters.orderType || null}
        onValueChange={(value) => updateFilter('orderType', value)}
      />
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-4" />
          {CONTENT.filters.clear}
        </Button>
      )}
    </div>
  )

  return (
    <>
      <AppDataTable
        ariaLabel="Lista de pedidos"
        columns={columns}
        data={orders}
        isLoading={isLoading}
        error={error ? CONTENT.error.description : null}
        errorTitle={CONTENT.error.title}
        emptyIcon={<Package className="size-10 text-muted-foreground/60" />}
        emptyTitle={CONTENT.empty.title}
        emptyDescription={CONTENT.empty.description}
        toolbar={toolbar}
        onRowClick={openOrder}
        getRowId={(row) => row.id}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: (nextPage) => setFilters((prev) => ({ ...prev, page: nextPage })),
        }}
      />

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  )
}
