'use client'

import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, CreditCard, Trash2 } from 'lucide-react'

import { AppDataTable } from '@/components/admin/app-data-table'
import { Sheet } from '@/components/layout/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyableText } from '@/components/ui/clipboard-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { usePayments } from '@/hooks/admin/use-payments'

const STATUS_BLOCK_CANCEL = ['paid', 'approved', 'cancelled']

function canCancelLink(status: string) {
  return !STATUS_BLOCK_CANCEL.includes(status)
}

function canDeletePayment(status: string) {
  return status === 'cancelled'
}

const CONTENT = {
  columns: {
    customer: 'Cliente',
    product: 'Produto',
    amount: 'Valor',
    methodGateway: 'Método',
    status: 'Status',
    date: 'Data',
    actions: 'Ações',
  },
  fallbacks: {
    noName: 'Sem nome',
    noProduct: 'Pedido avulso',
    installments: (n: number) => `${n}x`,
    paidPrefix: 'Pago',
    createdPrefix: 'Criado',
    cancelAria: (id: string) => `Cancelar link ${id}`,
    deleteAria: (id: string) => `Excluir pagamento ${id}`,
  },
  sheet: {
    title: 'Detalhes do pagamento',
    subtitle: 'Informações completas do pagamento e gateway',
    customer: 'Cliente',
    email: 'E-mail',
    product: 'Produto',
    amount: 'Valor',
    installments: 'Parcelamento',
    method: 'Método',
    gateway: 'Gateway',
    status: 'Status',
    paymentId: 'ID do pagamento',
    orderId: 'ID do pedido',
    userId: 'ID do usuário',
    gatewayLinkId: 'ID no gateway',
    paymentUrl: 'Link de pagamento',
    boletoUrl: 'URL do boleto',
    createdAt: 'Criado em',
    paidAt: 'Pago em',
    openLink: 'Abrir link',
  },
  status: {
    pending: 'Pendente',
    paid: 'Pago',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    failed: 'Falhou',
    refunded: 'Reembolsado',
    approved: 'Aprovado',
    boleto_generated: 'Boleto Gerado',
    pix_generated: 'PIX Gerado',
  },
  gateway: {
    pagarme: 'Pagar.me',
    asaas: 'Asaas',
  },
  method: {
    pix: 'PIX',
    boleto: 'Boleto',
    credit_card: 'Cartão',
  },
  empty: {
    title: 'Nenhum pagamento encontrado',
    description: 'Não há pagamentos cadastrados no sistema.',
  },
  error: {
    title: 'Erro ao carregar pagamentos',
    description: 'Tente recarregar a página',
  },
  cancelLink: {
    button: 'Cancelar link',
    title: 'Cancelar link de pagamento',
    description:
      'O link será cancelado no gateway (Pagar.me/Asaas) e o status ficará como cancelado. Depois você poderá excluir o registro.',
    confirm: 'Cancelar link',
    cancel: 'Voltar',
  },
  delete: {
    button: 'Excluir',
    title: 'Excluir pagamento',
    description: 'O link já foi cancelado. Deseja remover o registro permanentemente do sistema?',
    confirm: 'Excluir',
    cancel: 'Voltar',
  },
} as const

type PaymentRow = NonNullable<ReturnType<typeof usePayments>['data']>[number]

function formatPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    pending: 'bg-warning/10 text-warning hover:bg-warning/20 border-transparent',
    paid: 'bg-success/10 text-success hover:bg-success/20 border-transparent',
    approved: 'bg-success/10 text-success hover:bg-success/20 border-transparent',
    expired: 'bg-muted text-muted-foreground hover:bg-muted/80 border-transparent',
    cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent',
    failed: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent',
    refunded: 'bg-warning/10 text-warning hover:bg-warning/20 border-transparent',
    boleto_generated: 'bg-info/10 text-info hover:bg-info/20 border-transparent',
    pix_generated: 'bg-info/10 text-info hover:bg-info/20 border-transparent',
  }

  const icons: Record<string, string> = {
    pending: '⏳',
    paid: '✅',
    approved: '✅',
    expired: '⌛',
    cancelled: '❌',
    failed: '❌',
    refunded: '↩️',
    boleto_generated: '🧾',
    pix_generated: '📱',
  }

  const label = CONTENT.status[status as keyof typeof CONTENT.status] || status

  return (
    <Badge className={variants[status] || 'bg-muted text-muted-foreground border-transparent'}>
      <span className="mr-1">{icons[status] || '📄'}</span>
      {label}
    </Badge>
  )
}

export function PaymentsTable() {
  const queryClient = useQueryClient()
  const { data: payments = [], isLoading, error } = usePayments()
  const [deleting, setDeleting] = useState<{ id: string; gateway: 'pagarme' | 'asaas' } | null>(
    null
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<{ id: string; gateway: 'pagarme' | 'asaas' } | null>(
    null
  )
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null)

  const handleConfirmCancelLink = async () => {
    if (!cancelling) return
    setCancelError(null)
    const res = await fetch(
      `/api/admin/payments/${cancelling.id}/cancel?gateway=${cancelling.gateway}`,
      { method: 'POST', credentials: 'include' }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setCancelError(body.error || 'Erro ao cancelar link')
      return
    }
    setCancelling(null)
    await queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
  }

  const handleConfirmDelete = async () => {
    if (!deleting) return
    setDeleteError(null)
    const res = await fetch(`/api/admin/payments/${deleting.id}?gateway=${deleting.gateway}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setDeleteError(body.error || 'Erro ao excluir')
      return
    }
    setDeleting(null)
    await queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
  }

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        id: 'customer',
        header: CONTENT.columns.customer,
        cell: ({ row }) => {
          const customer = row.original.customer
          return (
            <div className="flex min-w-0 max-w-[210px] flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {customer?.name || CONTENT.fallbacks.noName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {customer?.email || row.original.user_id.slice(0, 8)}
              </span>
            </div>
          )
        },
      },
      {
        id: 'product',
        header: CONTENT.columns.product,
        cell: ({ row }) => {
          const product = row.original.product
          const shortOrder = row.original.order_id?.slice(0, 8)
          return (
            <div className="flex min-w-0 max-w-[210px] flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {product?.name || CONTENT.fallbacks.noProduct}
              </span>
              <code className="truncate font-mono text-[11px] text-muted-foreground">
                {shortOrder ? `#${shortOrder}` : `#${row.original.id.slice(0, 8)}`}
              </code>
            </div>
          )
        },
      },
      {
        accessorKey: 'amount_cents',
        header: CONTENT.columns.amount,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right whitespace-nowrap',
        },
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatPrice(row.original.amount_cents)}
            </span>
            {row.original.installments && row.original.installments > 1 ? (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {CONTENT.fallbacks.installments(row.original.installments)}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'payment_method',
        header: CONTENT.columns.methodGateway,
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const methodLabel = row.original.payment_method
            ? CONTENT.method[row.original.payment_method as keyof typeof CONTENT.method] ||
              row.original.payment_method
            : '—'
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{methodLabel}</span>
              <span className="text-[11px] text-muted-foreground">
                {CONTENT.gateway[row.original.payment_gateway]}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: CONTENT.columns.status,
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'date',
        header: CONTENT.columns.date,
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right whitespace-nowrap tabular-nums',
        },
        cell: ({ row }) => {
          const date = row.original.paid_at || row.original.created_at
          const prefix = row.original.paid_at
            ? CONTENT.fallbacks.paidPrefix
            : CONTENT.fallbacks.createdPrefix
          return (
            <div className="flex flex-col items-end">
              <span className="text-xs text-foreground">
                {date
                  ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
                  : '—'}
              </span>
              <span className="text-[11px] text-muted-foreground">{prefix}</span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: CONTENT.columns.actions,
        meta: {
          headerClassName: 'text-right w-20',
          cellClassName: 'text-right whitespace-nowrap',
        },
        cell: ({ row }) => {
          const payment = row.original
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {canCancelLink(payment.status) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-warning hover:text-warning hover:bg-warning/10"
                  onClick={() =>
                    setCancelling({
                      id: payment.id,
                      gateway: payment.payment_gateway,
                    })
                  }
                  aria-label={CONTENT.fallbacks.cancelAria(payment.id.slice(0, 8))}
                  title={CONTENT.cancelLink.button}
                >
                  <Ban className="size-4" />
                </Button>
              )}
              {canDeletePayment(payment.status) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setDeleting({
                      id: payment.id,
                      gateway: payment.payment_gateway,
                    })
                  }
                  aria-label={CONTENT.fallbacks.deleteAria(payment.id.slice(0, 8))}
                  title={CONTENT.delete.button}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              {!canCancelLink(payment.status) && !canDeletePayment(payment.status) && (
                <span className="text-xs text-muted-foreground px-2">—</span>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <AppDataTable
        ariaLabel="Lista de pagamentos"
        columns={columns}
        data={payments}
        isLoading={isLoading}
        error={error ? CONTENT.error.description : null}
        errorTitle={CONTENT.error.title}
        emptyIcon={<CreditCard className="size-10 text-muted-foreground/60" />}
        emptyTitle={CONTENT.empty.title}
        emptyDescription={CONTENT.empty.description}
        onRowClick={(row) => setSelectedPayment(row)}
        getRowId={(row) => row.id}
      />

      <Sheet
        open={selectedPayment !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null)
        }}
        title={CONTENT.sheet.title}
        description={
          selectedPayment
            ? `#${selectedPayment.id.slice(0, 8)} · ${CONTENT.gateway[selectedPayment.payment_gateway]}`
            : CONTENT.sheet.subtitle
        }
        size="md"
        hideFooter={
          !selectedPayment ||
          (!canCancelLink(selectedPayment.status) && !canDeletePayment(selectedPayment.status))
        }
        footerContent={
          selectedPayment ? (
            <div className="flex w-full items-center justify-end gap-2">
              {canCancelLink(selectedPayment.status) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-warning"
                  onClick={() => {
                    const target = selectedPayment
                    setSelectedPayment(null)
                    setCancelling({ id: target.id, gateway: target.payment_gateway })
                  }}
                >
                  <Ban className="mr-1.5 size-3.5" />
                  {CONTENT.cancelLink.button}
                </Button>
              )}
              {canDeletePayment(selectedPayment.status) && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const target = selectedPayment
                    setSelectedPayment(null)
                    setDeleting({ id: target.id, gateway: target.payment_gateway })
                  }}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  {CONTENT.delete.button}
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selectedPayment && (
          <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.status}</dt>
              <dd>{getStatusBadge(selectedPayment.status)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.amount}</dt>
              <dd className="font-mono font-semibold tabular-nums">
                {formatPrice(selectedPayment.amount_cents)}
                {selectedPayment.installments && selectedPayment.installments > 1
                  ? ` (${CONTENT.fallbacks.installments(selectedPayment.installments)})`
                  : ''}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.customer}</dt>
              <dd className="text-right font-medium">
                {selectedPayment.customer?.name || CONTENT.fallbacks.noName}
              </dd>
            </div>
            {selectedPayment.customer?.email && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.email}</dt>
                <dd className="text-right text-xs">{selectedPayment.customer.email}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.product}</dt>
              <dd className="text-right font-medium">
                {selectedPayment.product?.name || CONTENT.fallbacks.noProduct}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.method}</dt>
              <dd>
                {selectedPayment.payment_method
                  ? CONTENT.method[selectedPayment.payment_method as keyof typeof CONTENT.method] ||
                    selectedPayment.payment_method
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.gateway}</dt>
              <dd>{CONTENT.gateway[selectedPayment.payment_gateway]}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.createdAt}</dt>
              <dd className="tabular-nums text-xs">
                {new Date(selectedPayment.created_at).toLocaleString('pt-BR')}
              </dd>
            </div>
            {selectedPayment.paid_at && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.paidAt}</dt>
                <dd className="tabular-nums text-xs">
                  {new Date(selectedPayment.paid_at).toLocaleString('pt-BR')}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.paymentId}</dt>
              <dd>
                <CopyableText text={selectedPayment.id} />
              </dd>
            </div>
            {selectedPayment.order_id && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.orderId}</dt>
                <dd>
                  <CopyableText text={selectedPayment.order_id} />
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{CONTENT.sheet.userId}</dt>
              <dd>
                <CopyableText text={selectedPayment.user_id} />
              </dd>
            </div>
            {(selectedPayment.payment_link_id || selectedPayment.asaas_payment_id) && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{CONTENT.sheet.gatewayLinkId}</dt>
                <dd>
                  <CopyableText
                    text={selectedPayment.payment_link_id || selectedPayment.asaas_payment_id || ''}
                  />
                </dd>
              </div>
            )}
            {(selectedPayment.payment_link_url || selectedPayment.boleto_url) && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">
                  {selectedPayment.payment_link_url
                    ? CONTENT.sheet.paymentUrl
                    : CONTENT.sheet.boletoUrl}
                </dt>
                <dd>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={selectedPayment.payment_link_url || selectedPayment.boleto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    {CONTENT.sheet.openLink}
                  </Button>
                </dd>
              </div>
            )}
          </dl>
        )}
      </Sheet>

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelling(null)
            setCancelError(null)
          }
        }}
        title={CONTENT.cancelLink.title}
        description={cancelError ?? CONTENT.cancelLink.description}
        confirmText={CONTENT.cancelLink.confirm}
        cancelText={CONTENT.cancelLink.cancel}
        variant="destructive"
        onConfirm={handleConfirmCancelLink}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            setDeleteError(null)
          }
        }}
        title={CONTENT.delete.title}
        description={deleteError ?? CONTENT.delete.description}
        confirmText={CONTENT.delete.confirm}
        cancelText={CONTENT.delete.cancel}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
