'use client'

import { useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, CreditCard, Trash2 } from 'lucide-react'

import { AppDataTable } from '@/components/admin/app-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        accessorKey: 'user_id',
        header: 'Usuário',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground font-mono">
            {row.original.user_id.slice(0, 8)}...
          </code>
        ),
      },
      {
        accessorKey: 'order_id',
        header: 'Pedido',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.order_id ? (
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {row.original.order_id.slice(0, 8)}...
            </code>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'amount_cents',
        header: 'Valor',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right font-mono font-semibold tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) => formatPrice(row.original.amount_cents),
      },
      {
        accessorKey: 'payment_method',
        header: 'Método',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.payment_method ? (
            <Badge variant="outline" className="text-xs">
              {CONTENT.method[row.original.payment_method as keyof typeof CONTENT.method] ||
                row.original.payment_method}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { cellClassName: 'whitespace-nowrap' },
        cell: ({ row }) => getStatusBadge(row.original.status),
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
        accessorKey: 'paid_at',
        header: 'Pago em',
        meta: {
          headerClassName: 'text-right',
          cellClassName: 'text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap',
        },
        cell: ({ row }) =>
          row.original.paid_at
            ? formatDistanceToNow(new Date(row.original.paid_at), {
                addSuffix: true,
                locale: ptBR,
              })
            : '—',
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
          headerClassName: 'text-right w-24',
          cellClassName: 'text-right whitespace-nowrap',
        },
        cell: ({ row }) => {
          const payment = row.original
          return (
            <div className="flex items-center justify-end gap-1">
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
                  aria-label={`Cancelar link ${payment.id.slice(0, 8)}`}
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
                  aria-label={`Excluir pagamento ${payment.id.slice(0, 8)}`}
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
        getRowId={(row) => row.id}
      />

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
