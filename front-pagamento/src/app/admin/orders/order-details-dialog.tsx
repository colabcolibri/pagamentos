'use client'

import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, Banknote, CheckCircle2, ExternalLink, Mail, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog } from '@/components/layout/ui/dialog'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardButton, CopyableText } from '@/components/ui/clipboard-button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Separator } from '@/components/ui/separator'
import { copyToClipboard } from '@/lib/clipboard'
import { devError } from '@/lib/dev-log'

import type { Order } from './types'
import { ORDER_EMAIL_TYPES, type OrderEmailType, useOrderEmails } from './use-order-emails'

// Helper para copiar com mensagem customizada
const handleCopy = (text: string) => {
  copyToClipboard(text, {
    successMessage: CONTENT.actions.copied,
  })
}

const InfoField = ({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) => (
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground">{label}:</span>
    <span className={valueClassName || 'font-medium'}>{value}</span>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold mb-3">{title}</h3>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
)

const formatDateTime = (date: string | Date) =>
  format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

interface OrderDetailsDialogProps {
  order: Order | null
  open: boolean
  onClose: () => void
}

const CONTENT = {
  title: 'Detalhes do pedido',
  sections: {
    general: 'Informações gerais',
    customer: 'Cliente',
    product: 'Produto',
    payment: 'Pagamento',
    emails: 'Acompanhamento de emails do pedido',
    emailHistory: 'Histórico de envios',
    timeline: 'Linha do tempo',
  },
  fields: {
    orderId: 'ID do pedido',
    status: 'Status',
    type: 'Tipo',
    created: 'Criado em',
    updated: 'Atualizado em',
    expires: 'Expira em',
    customer: 'Cliente',
    email: 'Email',
    product: 'Produto',
    ref: 'Referência',
    price: 'Valor',
    gateway: 'Gateway',
    method: 'Método',
    subscription: 'Assinatura',
    paymentLink: 'Link de pagamento',
  },
  type: {
    one_time: 'Pagamento único',
    subscription: 'Assinatura',
  },
  gateway: {
    pagarme: 'Pagar.me',
    asaas: 'Asaas',
  },
  actions: {
    copy: 'Copiar',
    copied: 'Copiado!',
    open: 'Abrir',
    sendEmail: 'Enviar email',
    resendEmail: 'Reenviar email',
    delete: 'Deletar pedido',
    deleteConfirm: {
      title: 'Deletar pedido?',
      description:
        'Tem certeza que deseja deletar este pedido? Esta ação não pode ser desfeita. O pedido será ocultado mas os dados fiscais serão mantidos.',
      confirm: 'Deletar',
      deleting: 'Deletando...',
      cancel: 'Cancelar',
    },
    deletePermanent: 'Excluir permanentemente',
    deletePermanentConfirm: {
      title: 'Excluir pedido permanentemente?',
      description:
        'Esta ação remove o pedido do sistema de forma irreversível. Os registros de pagamento (Pagar.me/Asaas) são mantidos por compliance, mas o vínculo com este pedido será removido. Só super_admin pode excluir pedidos que já têm pagamentos. Confirme apenas se tiver certeza.',
      confirm: 'Excluir permanentemente',
      deleting: 'Excluindo...',
      cancel: 'Cancelar',
    },
    cancelOrder: 'Cancelar pedido',
    cancelOrderConfirm: {
      title: 'Cancelar pedido?',
      description:
        'Os links de pagamento vinculados serão cancelados no gateway (Pagar.me ou Asaas) e o pedido passará ao status cancelado. Pedidos já pagos ou com cobrança confirmada não podem ser cancelados por aqui.',
      confirm: 'Cancelar pedido',
      confirming: 'Cancelando...',
      cancel: 'Voltar',
    },
    markAsPaid: 'Marcar como pago',
    markAsPaidConfirm: {
      title: 'Marcar pedido como pago?',
      description:
        'Use para conciliar pedidos antigos (ex.: Pagar.me) em que o pagamento já ocorreu mas o sistema não atualizou. As cobranças vinculadas neste pedido serão marcadas como pagas, o pedido passará a pago, a assinatura poderá ser ativada se aplicável e o webhook do produto será disparado. Confirme apenas se o pagamento foi realmente recebido.',
      confirm: 'Marcar como pago',
      confirming: 'Salvando...',
      cancel: 'Voltar',
    },
  },
  emails: {
    loading: 'Carregando...',
    empty: 'Nenhum email enviado',
    notSent: 'Ainda não enviado',
    lastSent: 'Último envio',
    recipient: 'Para',
    type: 'Tipo',
    types: {
      order_created: 'Pedido criado',
      payment_confirmed: 'Confirmação de pagamento',
    },
    sendConfirm: {
      title: 'Enviar email?',
      description: (subject: string, recipient: string) =>
        `Enviar o email "${subject}" para ${recipient}?`,
      confirm: 'Enviar',
      confirming: 'Enviando...',
      cancel: 'Cancelar',
    },
    resendConfirm: {
      title: 'Reenviar email?',
      description: (subject: string, recipient: string) =>
        `Tem certeza que deseja reenviar o email "${subject}" para ${recipient}?`,
      confirm: 'Reenviar',
      confirming: 'Reenviando...',
      cancel: 'Cancelar',
    },
  },
} as const

export function OrderDetailsDialog({ order, open, onClose }: OrderDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePermanentDialogOpen, setDeletePermanentDialogOpen] = useState(false)
  const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false)
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false)
  const [emailAction, setEmailAction] = useState<{
    type: OrderEmailType
    subject: string
    recipient: string
    isResend: boolean
  } | null>(null)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingPermanent, setDeletingPermanent] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const {
    emailLogs,
    isLoading: loadingEmails,
    refetch: refetchEmails,
  } = useOrderEmails(open ? order?.id : undefined)

  if (!order) return null

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: order.prices?.currency || 'BRL',
    }).format(cents / 100)
  }

  const handleSendEmail = async () => {
    if (!emailAction || !order) return

    setSending(true)
    try {
      const response = await fetch('/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          emailType: emailAction.type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email')
      }

      const message = emailAction.isResend ? 'reenviado' : 'enviado'
      toast.success(emailAction.isResend ? 'Email reenviado com sucesso!' : 'Email enviado!', {
        description: `Email "${emailAction.subject}" foi ${message} para ${emailAction.recipient}`,
      })
      refetchEmails()
    } catch (error) {
      devError('Erro ao enviar email:', error)
      toast.error(emailAction.isResend ? 'Erro ao reenviar email' : 'Erro ao enviar email', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setSending(false)
      setEmailAction(null)
      setConfirmDialogOpen(false)
    }
  }

  const canCancelOrder =
    order.status === 'pending' || order.status === 'failed' || order.status === 'expired'

  const canMarkAsPaid = canCancelOrder

  const canDeleteOrder = order.status === 'cancelled'

  const handleCancelOrder = async () => {
    if (!order) return

    setCancellingOrder(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cancelar pedido')
      }

      toast.success(
        data.alreadyCancelled ? 'Pedido já estava cancelado.' : 'Pedido cancelado com sucesso.',
        {
          description: data.alreadyCancelled
            ? undefined
            : 'Cobranças vinculadas foram canceladas no gateway quando aplicável.',
        }
      )

      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })

      setCancelOrderDialogOpen(false)
      onClose()
    } catch (error) {
      devError('Erro ao cancelar pedido:', error)
      toast.error('Erro ao cancelar pedido', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setCancellingOrder(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!order) return

    setMarkingPaid(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/mark-paid`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar pedido como pago')
      }

      toast.success(
        data.alreadyPaid ? 'Pedido já estava como pago.' : 'Pedido marcado como pago.',
        {
          description: data.alreadyPaid
            ? undefined
            : 'Cobranças vinculadas foram atualizadas quando necessário.',
        }
      )

      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })

      setMarkPaidDialogOpen(false)
      onClose()
    } catch (error) {
      devError('Erro ao marcar pedido como pago:', error)
      toast.error('Erro ao marcar como pago', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!order) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar pedido')
      }

      toast.success('Pedido deletado com sucesso!', {
        description: 'O pedido foi ocultado mas os dados fiscais foram mantidos.',
      })

      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })

      // Fechar dialog
      onClose()
    } catch (error) {
      devError('Erro ao deletar pedido:', error)
      toast.error('Erro ao deletar pedido', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleDeletePermanent = async () => {
    if (!order) return

    setDeletingPermanent(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/delete-permanent`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao excluir pedido permanentemente')
      }

      toast.success('Pedido excluído permanentemente.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      onClose()
    } catch (error) {
      devError('Erro ao excluir pedido permanentemente:', error)
      toast.error('Erro ao excluir pedido', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setDeletingPermanent(false)
      setDeletePermanentDialogOpen(false)
    }
  }

  const paymentLinkUrl =
    order.metadata && typeof order.metadata === 'object' && 'payment_link_url' in order.metadata
      ? (order.metadata.payment_link_url as string)
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={CONTENT.title}
      size="2xl"
      contentPadding="px-6 py-6 sm:px-8"
      footerContent={
        <div className="dialog-footer-buttons flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {canMarkAsPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkPaidDialogOpen(true)}
              disabled={deleting || deletingPermanent || cancellingOrder || markingPaid}
              className="gap-2 border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <Banknote className="h-4 w-4 shrink-0" />
              {CONTENT.actions.markAsPaid}
            </Button>
          )}
          {canCancelOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOrderDialogOpen(true)}
              disabled={deleting || deletingPermanent || cancellingOrder || markingPaid}
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Ban className="h-4 w-4 shrink-0" />
              {CONTENT.actions.cancelOrder}
            </Button>
          )}
          {canDeleteOrder && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting || deletingPermanent || cancellingOrder || markingPaid}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {deleting ? CONTENT.actions.deleteConfirm.deleting : CONTENT.actions.delete}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletePermanentDialogOpen(true)}
                disabled={deleting || deletingPermanent || cancellingOrder || markingPaid}
                className="gap-2 opacity-90"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {CONTENT.actions.deletePermanent}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{order.id}</code>
        <ClipboardButton text={order.id} onCopy={handleCopy} />
      </div>

      <div className="space-y-6">
        {/* Status e tipo */}
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <Badge variant="outline">{CONTENT.type[order.order_type]}</Badge>
          <Badge variant="secondary">{CONTENT.gateway[order.payment_gateway]}</Badge>
        </div>

        <Separator />

        {/* Cliente */}
        <Section title={CONTENT.sections.customer}>
          <InfoField label={CONTENT.fields.customer} value={order.profiles?.name || 'Sem nome'} />
          <InfoField
            label={CONTENT.fields.email}
            value={
              order.profiles?.email ? (
                <CopyableText text={order.profiles.email} onCopy={handleCopy} />
              ) : (
                '-'
              )
            }
          />
        </Section>

        <Separator />

        {/* Produto */}
        <Section title={CONTENT.sections.product}>
          <InfoField label={CONTENT.fields.product} value={order.products?.name} />
          <InfoField
            label={CONTENT.fields.ref}
            value={
              <code className="text-xs bg-muted px-2 py-1 rounded">{order.products?.ref}</code>
            }
          />
          <InfoField
            label={CONTENT.fields.price}
            value={formatPrice(order.amount_cents)}
            valueClassName="font-mono font-bold text-lg"
          />
        </Section>

        <Separator />

        {/* Pagamento */}
        <Section title={CONTENT.sections.payment}>
          <InfoField
            label={CONTENT.fields.gateway}
            value={CONTENT.gateway[order.payment_gateway]}
          />
          {order.payment_method && (
            <InfoField
              label={CONTENT.fields.method}
              value={<Badge variant="outline">{order.payment_method}</Badge>}
            />
          )}
          {order.subscription_id && (
            <InfoField
              label={CONTENT.fields.subscription}
              value={
                <CopyableText
                  text={order.subscription_id}
                  onCopy={handleCopy}
                  textClassName="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] overflow-x-auto"
                />
              }
            />
          )}
          {paymentLinkUrl && (
            <InfoField
              label={CONTENT.fields.paymentLink}
              value={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentLinkUrl, '_blank')}
                    className="h-7"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {CONTENT.actions.open}
                  </Button>
                  <ClipboardButton text={paymentLinkUrl} onCopy={handleCopy} className="h-7 w-7" />
                </div>
              }
            />
          )}
        </Section>

        <Separator />

        {/* Acompanhamento de emails do pedido */}
        <Section title={CONTENT.sections.emails}>
          {loadingEmails ? (
            <div className="text-sm text-muted-foreground">{CONTENT.emails.loading}</div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {ORDER_EMAIL_TYPES.map((emailType) => {
                  const typeLabel = CONTENT.emails.types[
                    emailType as keyof typeof CONTENT.emails.types
                  ] as string
                  const lastLog = emailLogs.find((e) => e.metadata?.type === emailType)
                  const wasSent = !!lastLog && lastLog.status === 'success'

                  return (
                    <div
                      key={emailType}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{typeLabel}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {wasSent ? (
                            <>
                              {CONTENT.emails.lastSent}: {formatDateTime(lastLog!.created_at)}
                              {lastLog!.recipient &&
                                ` — ${CONTENT.emails.recipient}: ${lastLog!.recipient}`}
                            </>
                          ) : (
                            CONTENT.emails.notSent
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setEmailAction({
                            type: emailType,
                            subject: lastLog?.subject ?? typeLabel,
                            recipient: lastLog?.recipient ?? order.profiles?.email ?? '',
                            isResend: wasSent,
                          })
                          setConfirmDialogOpen(true)
                        }}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        {wasSent ? CONTENT.actions.resendEmail : CONTENT.actions.sendEmail}
                      </Button>
                    </div>
                  )
                })}
              </div>
              {emailLogs.length > 0 && (
                <>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {CONTENT.sections.emailHistory}
                  </h4>
                  <div className="space-y-2">
                    {emailLogs.map((email) => {
                      const typeLabel =
                        email.metadata?.type === 'order_created'
                          ? CONTENT.emails.types.order_created
                          : CONTENT.emails.types.payment_confirmed
                      return (
                        <div
                          key={email.id}
                          className="flex items-start justify-between p-2 rounded-md bg-muted/20 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {email.status === 'success' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              )}
                              <span className="truncate">{email.subject}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {typeLabel} · {email.recipient} · {formatDateTime(email.created_at)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-7 text-xs"
                            onClick={() => {
                              setEmailAction({
                                type: (email.metadata?.type ?? 'order_created') as OrderEmailType,
                                subject: email.subject,
                                recipient: email.recipient,
                                isResend: true,
                              })
                              setConfirmDialogOpen(true)
                            }}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            {CONTENT.actions.resendEmail}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </Section>

        <Separator />

        {/* Timeline */}
        <Section title={CONTENT.sections.timeline}>
          <InfoField
            label={CONTENT.fields.created}
            value={<span className="font-mono text-xs">{formatDateTime(order.created_at)}</span>}
          />
          <InfoField
            label={CONTENT.fields.updated}
            value={<span className="font-mono text-xs">{formatDateTime(order.updated_at)}</span>}
          />
          {order.expires_at && (
            <InfoField
              label={CONTENT.fields.expires}
              value={<span className="font-mono text-xs">{formatDateTime(order.expires_at)}</span>}
            />
          )}
        </Section>
      </div>

      {/* Dialog de confirmação para enviar/reenviar email */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open) setEmailAction(null)
        }}
        title={
          emailAction?.isResend
            ? CONTENT.emails.resendConfirm.title
            : CONTENT.emails.sendConfirm.title
        }
        description={
          emailAction
            ? emailAction.isResend
              ? CONTENT.emails.resendConfirm.description(emailAction.subject, emailAction.recipient)
              : CONTENT.emails.sendConfirm.description(emailAction.subject, emailAction.recipient)
            : ''
        }
        confirmText={
          emailAction?.isResend
            ? sending
              ? CONTENT.emails.resendConfirm.confirming
              : CONTENT.emails.resendConfirm.confirm
            : sending
              ? CONTENT.emails.sendConfirm.confirming
              : CONTENT.emails.sendConfirm.confirm
        }
        cancelText={
          emailAction?.isResend
            ? CONTENT.emails.resendConfirm.cancel
            : CONTENT.emails.sendConfirm.cancel
        }
        onConfirm={handleSendEmail}
      />

      {/* Dialog de confirmação para deletar */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={CONTENT.actions.deleteConfirm.title}
        description={CONTENT.actions.deleteConfirm.description}
        confirmText={
          deleting ? CONTENT.actions.deleteConfirm.deleting : CONTENT.actions.deleteConfirm.confirm
        }
        cancelText={CONTENT.actions.deleteConfirm.cancel}
        onConfirm={handleDeleteOrder}
        variant="destructive"
      />

      <ConfirmDialog
        open={deletePermanentDialogOpen}
        onOpenChange={setDeletePermanentDialogOpen}
        title={CONTENT.actions.deletePermanentConfirm.title}
        description={CONTENT.actions.deletePermanentConfirm.description}
        confirmText={
          deletingPermanent
            ? CONTENT.actions.deletePermanentConfirm.deleting
            : CONTENT.actions.deletePermanentConfirm.confirm
        }
        cancelText={CONTENT.actions.deletePermanentConfirm.cancel}
        onConfirm={handleDeletePermanent}
        variant="destructive"
      />

      <ConfirmDialog
        open={cancelOrderDialogOpen}
        onOpenChange={setCancelOrderDialogOpen}
        title={CONTENT.actions.cancelOrderConfirm.title}
        description={CONTENT.actions.cancelOrderConfirm.description}
        confirmText={
          cancellingOrder
            ? CONTENT.actions.cancelOrderConfirm.confirming
            : CONTENT.actions.cancelOrderConfirm.confirm
        }
        cancelText={CONTENT.actions.cancelOrderConfirm.cancel}
        onConfirm={handleCancelOrder}
        variant="destructive"
      />

      <ConfirmDialog
        open={markPaidDialogOpen}
        onOpenChange={setMarkPaidDialogOpen}
        title={CONTENT.actions.markAsPaidConfirm.title}
        description={CONTENT.actions.markAsPaidConfirm.description}
        confirmText={
          markingPaid
            ? CONTENT.actions.markAsPaidConfirm.confirming
            : CONTENT.actions.markAsPaidConfirm.confirm
        }
        cancelText={CONTENT.actions.markAsPaidConfirm.cancel}
        onConfirm={handleMarkAsPaid}
      />
    </Dialog>
  )
}
