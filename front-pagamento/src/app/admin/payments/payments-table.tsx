'use client'

import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, Trash2, XCircle } from 'lucide-react'

import { AdminTableWrapper } from '@/components/admin/admin-table-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePayments } from '@/hooks/admin/use-payments'

const STATUS_BLOCK_CANCEL = ['paid', 'approved', 'cancelled']

function canCancelLink(status: string) {
  return !STATUS_BLOCK_CANCEL.includes(status)
}

function canDeletePayment(status: string) {
  return status === 'cancelled'
}

const CONTENT = {
  table: {
    id: 'ID',
    user: 'Usuário',
    order: 'Pedido',
    amount: 'Valor',
    method: 'Método',
    status: 'Status',
    gateway: 'Gateway',
    paidAt: 'Pago em',
    created: 'Criado',
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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-warning/10 text-warning hover:bg-warning/20',
      paid: 'bg-success/10 text-success hover:bg-success/20',
      approved: 'bg-success/10 text-success hover:bg-success/20',
      expired: 'bg-muted text-muted-foreground hover:bg-muted/80',
      cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      failed: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      refunded: 'bg-warning/10 text-warning hover:bg-warning/20',
      boleto_generated: 'bg-info/10 text-info hover:bg-info/20',
      pix_generated: 'bg-info/10 text-info hover:bg-info/20',
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
      <Badge className={variants[status] || 'bg-muted text-muted-foreground'}>
        <span className="mr-1">{icons[status] || '📄'}</span>
        {label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
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
      <div className="bg-background border rounded-lg overflow-hidden">
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
      {payments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-8 md:p-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.empty.title}
            </h3>
            <p className="text-sm text-muted-foreground">{CONTENT.empty.description}</p>
          </div>
        </div>
      ) : (
        <AdminTableWrapper aria-label="Lista de pagamentos">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">{CONTENT.table.id}</TableHead>
                <TableHead>{CONTENT.table.user}</TableHead>
                <TableHead>{CONTENT.table.order}</TableHead>
                <TableHead className="text-right">{CONTENT.table.amount}</TableHead>
                <TableHead>{CONTENT.table.method}</TableHead>
                <TableHead>{CONTENT.table.status}</TableHead>
                <TableHead>{CONTENT.table.gateway}</TableHead>
                <TableHead className="text-right">{CONTENT.table.paidAt}</TableHead>
                <TableHead className="text-right">{CONTENT.table.created}</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {payment.id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {payment.user_id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    {payment.order_id ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {payment.order_id.slice(0, 8)}...
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-bold">{formatPrice(payment.amount_cents)}</span>
                  </TableCell>
                  <TableCell>
                    {payment.payment_method ? (
                      <Badge variant="outline" className="text-xs">
                        {CONTENT.method[payment.payment_method as keyof typeof CONTENT.method] ||
                          payment.payment_method}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {CONTENT.gateway[payment.payment_gateway]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {payment.paid_at
                      ? formatDistanceToNow(new Date(payment.paid_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {payment.created_at
                      ? formatDistanceToNow(new Date(payment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canCancelLink(payment.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
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
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {canDeletePayment(payment.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {!canCancelLink(payment.status) && !canDeletePayment(payment.status) && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableWrapper>
      )}

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
