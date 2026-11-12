'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, ChevronDown, ExternalLink, Eye, Info, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { PageContainer } from '@/components/layout/page-container'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicHeader } from '@/components/layout/public-header'
import { Dialog } from '@/components/layout/ui/dialog'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import type { RefundPolicyContent } from '@/components/refund-policy/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardButton, CopyableText } from '@/components/ui/clipboard-button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Order,
  useAuthCheck,
  useProfile,
  useProfileOrders,
  useUpdateProfile,
} from '@/hooks/use-profile'
import { copyToClipboard } from '@/lib/clipboard'
import { sanitizeRefundPolicyHtml } from '@/lib/sanitize-html'
import { cn } from '@/lib/utils'

const CONTENT = {
  profile: {
    title: 'Meu perfil',
    description: 'Informações da sua conta',
    error: 'Erro ao carregar perfil',
    fields: {
      email: 'Email',
      name: 'Nome completo',
      phone: 'Telefone',
    },
    emailHint:
      'O e-mail da conta é definido no cadastro/login. Para alterá-lo, use o fluxo de recuperação ou fale com o suporte.',
    save: 'Salvar alterações',
    saving: 'Salvando…',
    saved: 'Perfil atualizado.',
  },
  orders: {
    title: 'Meus pedidos',
    description: 'Histórico de compras e pagamentos',
    empty: 'Você ainda não possui pedidos.',
    loading: 'Carregando pedidos...',
    error: 'Erro ao carregar pedidos',
    product: 'Produto',
    productFallback: 'Produto',
    refPrefix: 'Ref:',
    amount: 'Valor',
    status: 'Status',
    created: 'Criado',
    method: 'Método',
    viewDetails: 'Ver detalhes',
    notAvailable: '-',
    details: {
      title: 'Detalhes do pedido',
      sections: {
        general: 'Informações gerais',
        product: 'Produto',
        payment: 'Pagamento',
        refundPolicy: 'Política de reembolso',
      },
      fields: {
        orderId: 'ID do pedido',
        status: 'Status',
        type: 'Tipo',
        created: 'Criado em',
        updated: 'Atualizado em',
        paid: 'Pago em',
        expires: 'Expira em',
        product: 'Produto',
        ref: 'Referência',
        description: 'Descrição',
        price: 'Valor',
        gateway: 'Gateway',
        method: 'Método',
        paymentLink: 'Link de pagamento',
        refundPolicy: 'Política de reembolso',
        viewRefundPolicy: 'Ver política de reembolso',
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
      },
    },
  },
} as const

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
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className={cn('text-sm font-medium', valueClassName)}>{value}</span>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold mb-3 text-foreground">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
)

const formatDateTime = (date: string | Date) =>
  format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

function ProfileAccountForm({
  email,
  initialName,
  initialPhone,
}: {
  email: string | null | undefined
  initialName: string | null | undefined
  initialPhone: string | null | undefined
}) {
  const updateProfile = useUpdateProfile()
  const [name, setName] = useState(initialName ?? '')
  const [phone, setPhone] = useState(() => (initialPhone ? initialPhone.replace(/\D/g, '') : ''))

  useEffect(() => {
    setName(initialName ?? '')
    setPhone(initialPhone ? initialPhone.replace(/\D/g, '') : '')
  }, [initialName, initialPhone])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateProfile.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: () => toast.success(CONTENT.profile.saved),
        onError: (err) => toast.error(err instanceof Error ? err.message : CONTENT.profile.error),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
      <div className="space-y-2 min-w-0">
        <Label htmlFor="profile-email-display">{CONTENT.profile.fields.email}</Label>
        <p
          id="profile-email-display"
          className="text-base text-foreground break-all rounded-md border border-transparent py-1"
        >
          {email ?? '—'}
        </p>
        <p className="text-xs text-muted-foreground">{CONTENT.profile.emailHint}</p>
      </div>

      <Separator />

      <div className="space-y-2 min-w-0">
        <Label htmlFor="profile-name">{CONTENT.profile.fields.name}</Label>
        <Input
          id="profile-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-full min-w-0"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2 min-w-0">
        <Label htmlFor="profile-phone">{CONTENT.profile.fields.phone}</Label>
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Opcional"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d+()\s.-]/g, ''))}
          className="w-full max-w-full min-w-0"
          maxLength={30}
        />
        <p className="text-xs text-muted-foreground">
          DDD + número (mínimo 10 dígitos), ou deixe em branco.
        </p>
      </div>

      <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
        {updateProfile.isPending ? CONTENT.profile.saving : CONTENT.profile.save}
      </Button>
    </form>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const authCheck = useAuthCheck()
  const user = authCheck.data?.user ?? null
  const isAdmin = authCheck.data?.isAdmin ?? false
  const canLoadProfile = !!user && !isAdmin

  const profileQuery = useProfile({ enabled: canLoadProfile })
  const ordersQuery = useProfileOrders({ enabled: canLoadProfile })

  const profileData = profileQuery.data ?? null
  const orders = ordersQuery.data ?? []
  const isLoading =
    authCheck.isLoading || (canLoadProfile && profileQuery.isLoading && !profileQuery.data)
  const isCheckingAdmin = authCheck.isLoading
  const isProfileError = profileQuery.isError
  const isOrdersError = ordersQuery.isError

  useEffect(() => {
    if (authCheck.isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (isAdmin) {
      router.push('/admin')
      return
    }
  }, [authCheck.isLoading, user, isAdmin, router])

  // Admin que caiu no /profile: mostrar aviso e botão para ir ao painel (nunca ficar preso)
  if (!authCheck.isLoading && user && isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-4 md:px-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-6 w-6" />
                <CardTitle>Conta administrativa</CardTitle>
              </div>
              <CardDescription>
                Você está logado como administrador. Use o painel para gerenciar produtos, pedidos e
                pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" size="lg" onClick={() => router.push('/admin')}>
                Abrir painel admin
              </Button>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    )
  }

  const formatPrice = (cents: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(cents / 100)
  }

  if (isCheckingAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <main className="flex-1">
          <PageContainer>
            <div className="py-12 md:py-24">
              <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </PageContainer>
        </main>
        <PublicFooter />
      </div>
    )
  }

  if (!authCheck.isLoading && canLoadProfile && !profileQuery.isLoading && !profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <main className="flex-1">
          <PageContainer>
            <div className="py-12 md:py-24">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {isProfileError ? CONTENT.profile.error : 'Perfil não encontrado.'}
                    </p>
                    {(isProfileError || isOrdersError) && (
                      <div className="flex justify-center gap-2">
                        {isProfileError && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => profileQuery.refetch()}
                          >
                            Tentar novamente
                          </Button>
                        )}
                        {isOrdersError && (
                          <Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()}>
                            Tentar novamente (pedidos)
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </PageContainer>
        </main>
        <PublicFooter />
      </div>
    )
  }

  if (!profileData) return null

  const { profile, user: profileUser } = profileData

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1">
        <PageContainer>
          <div className="py-12 md:py-24">
            <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
              {/* Page Header */}
              <div className="space-y-2">
                <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {CONTENT.profile.title}
                </h1>
                <p className="text-muted-foreground">{CONTENT.profile.description}</p>
              </div>

              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{CONTENT.profile.title}</CardTitle>
                  <CardDescription>{CONTENT.profile.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileAccountForm
                    email={profileUser.email}
                    initialName={profile?.name}
                    initialPhone={profile?.phone}
                  />
                </CardContent>
              </Card>

              {/* Orders Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{CONTENT.orders.title}</CardTitle>
                  <CardDescription>{CONTENT.orders.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersQuery.isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-16 flex-1" />
                        </div>
                      ))}
                    </div>
                  ) : isOrdersError ? (
                    <div className="space-y-3 py-6 text-center">
                      <p className="text-sm text-muted-foreground">{CONTENT.orders.error}</p>
                      <Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()}>
                        Tentar novamente
                      </Button>
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {CONTENT.orders.empty}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm text-foreground">
                                    {order.products?.name || CONTENT.orders.productFallback}
                                  </h4>
                                  {order.products?.ref && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {CONTENT.orders.refPrefix} {order.products.ref}
                                    </p>
                                  )}
                                  {order.products?.description && (
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                      {order.products.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold text-sm text-foreground">
                                    {formatPrice(order.amount_cents, order.prices?.currency)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {order.created_at
                                      ? formatDistanceToNow(new Date(order.created_at), {
                                          addSuffix: true,
                                          locale: ptBR,
                                        })
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <OrderStatusBadge status={order.status} />
                                {order.payment_method && (
                                  <Badge variant="outline" className="text-xs">
                                    {order.payment_method}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {order.payment_gateway === 'pagarme' ? 'Pagar.me' : 'Asaas'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {CONTENT.orders.viewDetails}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContainer>
      </main>

      {/* Footer */}
      <PublicFooter />

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

function OrderDetailsDialog({
  order,
  open,
  onClose,
}: {
  order: Order
  open: boolean
  onClose: () => void
}) {
  const [isRefundPolicyOpen, setIsRefundPolicyOpen] = useState(false)

  const handleCopy = (text: string) => {
    copyToClipboard(text, {
      successMessage: CONTENT.orders.details.actions.copied,
    })
  }

  const formatPrice = (cents: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(cents / 100)
  }

  const paymentLinkUrl =
    order.metadata && typeof order.metadata === 'object' && 'payment_link_url' in order.metadata
      ? (order.metadata.payment_link_url as string)
      : undefined

  // Buscar política de reembolso do metadata (salva como refund_policy_snapshot)
  const refundPolicy =
    order.metadata &&
    typeof order.metadata === 'object' &&
    'refund_policy_snapshot' in order.metadata
      ? (order.metadata.refund_policy_snapshot as RefundPolicyContent | null)
      : null

  const refundPolicyContent = refundPolicy

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={CONTENT.orders.details.title}
      size="2xl"
      contentPadding="px-6 py-6 sm:px-8"
      cancelText="Fechar"
      onCancel={onClose}
    >
      <div className="flex items-center gap-2 mb-4">
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{order.id}</code>
        <ClipboardButton text={order.id} onCopy={handleCopy} />
      </div>

      <div className="space-y-6">
        {/* Status e tipo */}
        <div className="flex items-center gap-3 flex-wrap">
          <OrderStatusBadge status={order.status} />
          <Badge variant="outline">{CONTENT.orders.details.type[order.order_type]}</Badge>
          <Badge variant="secondary">{CONTENT.orders.details.gateway[order.payment_gateway]}</Badge>
        </div>

        <Separator />

        {/* Informações gerais */}
        <Section title={CONTENT.orders.details.sections.general}>
          <InfoField
            label={CONTENT.orders.details.fields.orderId}
            value={<CopyableText text={order.id} onCopy={handleCopy} />}
          />
          <InfoField
            label={CONTENT.orders.details.fields.status}
            value={<OrderStatusBadge status={order.status} />}
          />
          <InfoField
            label={CONTENT.orders.details.fields.type}
            value={CONTENT.orders.details.type[order.order_type]}
          />
          <InfoField
            label={CONTENT.orders.details.fields.created}
            value={
              order.created_at ? formatDateTime(order.created_at) : CONTENT.orders.notAvailable
            }
          />
          <InfoField
            label={CONTENT.orders.details.fields.updated}
            value={
              order.updated_at ? formatDateTime(order.updated_at) : CONTENT.orders.notAvailable
            }
          />
          {order.paid_at && (
            <InfoField
              label={CONTENT.orders.details.fields.paid}
              value={formatDateTime(order.paid_at)}
            />
          )}
          {order.expires_at && (
            <InfoField
              label={CONTENT.orders.details.fields.expires}
              value={formatDateTime(order.expires_at)}
            />
          )}
        </Section>

        <Separator />

        {/* Produto */}
        <Section title={CONTENT.orders.details.sections.product}>
          <InfoField
            label={CONTENT.orders.details.fields.product}
            value={order.products?.name || CONTENT.orders.notAvailable}
          />
          {order.products?.ref && (
            <InfoField
              label={CONTENT.orders.details.fields.ref}
              value={<code className="text-xs">{order.products.ref}</code>}
            />
          )}
          {order.products?.description && (
            <InfoField
              label={CONTENT.orders.details.fields.description}
              value={<p className="text-xs text-muted-foreground">{order.products.description}</p>}
            />
          )}
        </Section>

        <Separator />

        {/* Pagamento */}
        <Section title={CONTENT.orders.details.sections.payment}>
          <InfoField
            label={CONTENT.orders.details.fields.price}
            value={
              <span className="font-mono font-bold">
                {formatPrice(order.amount_cents, order.prices?.currency)}
              </span>
            }
          />
          <InfoField
            label={CONTENT.orders.details.fields.gateway}
            value={CONTENT.orders.details.gateway[order.payment_gateway]}
          />
          {order.payment_method && (
            <InfoField
              label={CONTENT.orders.details.fields.method}
              value={<Badge variant="outline">{order.payment_method}</Badge>}
            />
          )}
          {paymentLinkUrl && (
            <InfoField
              label={CONTENT.orders.details.fields.paymentLink}
              value={
                <div className="flex items-center gap-2">
                  <CopyableText text={paymentLinkUrl} onCopy={handleCopy} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(paymentLinkUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {CONTENT.orders.details.actions.open}
                  </Button>
                </div>
              }
            />
          )}
        </Section>

        {refundPolicyContent && (
          <>
            <Separator />
            {/* Política de Reembolso */}
            <div>
              <Collapsible open={isRefundPolicyOpen} onOpenChange={setIsRefundPolicyOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {CONTENT.orders.details.sections.refundPolicy}
                    </h3>
                    {refundPolicyContent.title && (
                      <span className="text-xs text-muted-foreground">
                        - {refundPolicyContent.title}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isRefundPolicyOpen && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {refundPolicyContent.subtitle && (
                    <p className="text-sm text-muted-foreground">{refundPolicyContent.subtitle}</p>
                  )}
                  <div className="space-y-4">
                    {refundPolicyContent.sections.map((section, index) => (
                      <div
                        key={index}
                        className={cn(
                          'rounded-lg border p-4',
                          section.highlighted
                            ? 'border-primary/20 bg-primary/5'
                            : 'border-border bg-background'
                        )}
                      >
                        <h4
                          className={cn(
                            'flex items-center gap-2 text-sm font-semibold mb-3',
                            section.highlighted ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {section.highlighted ? (
                            <Info className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {index + 1}
                            </div>
                          )}
                          <span>{section.title}</span>
                        </h4>
                        <ul className="space-y-2">
                          {section.content
                            .filter((p) => p.trim() !== '')
                            .map((paragraph, pIndex) => (
                              <li key={pIndex} className="flex items-start gap-2">
                                <CheckCircle2
                                  className={cn(
                                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                                    section.highlighted ? 'text-primary' : 'text-muted-foreground'
                                  )}
                                />
                                <p
                                  className={cn(
                                    'text-xs leading-relaxed',
                                    section.highlighted ? 'text-primary/80' : 'text-foreground'
                                  )}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeRefundPolicyHtml(String(paragraph)),
                                  }}
                                />
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {refundPolicyContent.footer && (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                      {refundPolicyContent.footer}
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
