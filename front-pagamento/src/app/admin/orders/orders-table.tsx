'use client'

import { useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye, Filter, X, XCircle } from 'lucide-react'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
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
    status: {
      placeholder: 'Status',
      empty: 'Nenhum status encontrado',
    },
    gateway: {
      placeholder: 'Gateway',
      empty: 'Nenhum gateway encontrado',
    },
    method: {
      placeholder: 'Método',
      empty: 'Nenhum método encontrado',
    },
    type: {
      placeholder: 'Tipo',
      empty: 'Nenhum tipo encontrado',
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
    method: 'Método',
    status: 'Status',
    gateway: 'Gateway',
    created: 'Criado',
    actions: 'Ações',
  },
  gateway: {
    pagarme: 'Pagar.me',
    asaas: 'Asaas',
  },
  empty: {
    title: 'Nenhum pedido encontrado',
    description: 'Não há pedidos cadastrados no sistema.',
  },
  error: {
    title: 'Erro ao carregar pedidos',
    description: 'Tente recarregar a página',
  },
} as const

export function OrdersTable() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState<FetchOrdersParams>({
    page: 1,
    pageSize: 20,
  })

  const { data, isLoading, error } = useOrders(filters)

  const formatPrice = (cents: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(cents / 100)
  }

  const hasActiveFilters =
    !!filters.status || !!filters.gateway || !!filters.paymentMethod || !!filters.orderType

  const clearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 20,
    })
  }

  const updateFilter = (key: keyof FetchOrdersParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to page 1 when changing filters
    }))
  }

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const orders = data?.orders || []
  const total = data?.total || 0
  const page = data?.page || 1
  const pageSize = data?.pageSize || 20
  const totalPages = data?.totalPages || 0

  const startResult = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endResult = Math.min(page * pageSize, total)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton filters */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-[200px]" />
          ))}
        </div>

        {/* Skeleton table */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 text-center border-t border-destructive/20 bg-destructive/10">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground mb-2">
            {CONTENT.error.title}
          </h3>
          <p className="text-sm text-muted-foreground">{CONTENT.error.description}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
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
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
            <X className="h-4 w-4 mr-1" />
            {CONTENT.filters.clear}
          </Button>
        )}
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-8 md:p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.empty.title}
            </h3>
            <p className="text-sm text-muted-foreground">{CONTENT.empty.description}</p>
          </div>
        </div>
      ) : (
        <AdminTableWrapper aria-label="Lista de pedidos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">{CONTENT.table.id}</TableHead>
                <TableHead>{CONTENT.table.customer}</TableHead>
                <TableHead>{CONTENT.table.product}</TableHead>
                <TableHead className="text-right">{CONTENT.table.amount}</TableHead>
                <TableHead>{CONTENT.table.method}</TableHead>
                <TableHead>{CONTENT.table.status}</TableHead>
                <TableHead>{CONTENT.table.gateway}</TableHead>
                <TableHead className="text-right">{CONTENT.table.created}</TableHead>
                <TableHead className="w-20 text-right">{CONTENT.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {order.id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {order.profiles?.name || 'Sem nome'}
                      </span>
                      <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{order.products?.name}</span>
                      <code className="text-xs text-muted-foreground">{order.products?.ref}</code>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-bold">
                      {formatPrice(order.amount_cents, order.prices?.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.payment_method ? (
                      <Badge variant="outline" className="text-xs">
                        {order.payment_method}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {CONTENT.gateway[order.payment_gateway]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {order.created_at
                      ? formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSelectedOrder({
                          ...order,
                          created_at: order.created_at || '',
                          updated_at: order.updated_at || '',
                        })
                      }
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableWrapper>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 mt-4">
          <div className="text-sm text-muted-foreground">
            {CONTENT.pagination.showing} {startResult}-{endResult} {CONTENT.pagination.of} {total}{' '}
            {CONTENT.pagination.results}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {CONTENT.pagination.previous}
            </Button>
            <div className="text-sm font-medium">
              {CONTENT.pagination.page} {page} {CONTENT.pagination.of} {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
            >
              {CONTENT.pagination.next}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  )
}
