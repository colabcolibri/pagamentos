'use client'

import { useCallback, useEffect, useState } from 'react'

import { Eye, EyeOff, Mail, Package, ShieldCheck, Sparkles, Tag, Webhook } from 'lucide-react'

import { Field, FieldDescription, FieldLabel } from '@/components/layout/ui/admin-field'
import { AdminFormSection } from '@/components/layout/ui/admin-form-section'
import { Dialog } from '@/components/layout/ui/dialog'
import type { RefundPolicyContent } from '@/components/refund-policy/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { devError } from '@/lib/dev-log'
import {
  type Price,
  type Product,
  getProductAdminGroupLabel,
  mergeProductMetadataAdminGroup,
} from '@/lib/payments/product'
import { cn } from '@/lib/utils'

import { EditWithAIDialog } from './edit-with-ai-dialog'
import { EmailConfigEditor, type ProductEmailConfig } from './email-config-editor'
import type { CatalogProductLite } from './price-editor'
import { PricesEditor } from './prices-editor'
import { RefundPolicyEditor } from './refund-policy-editor'

const DEFAULT_PAYMENT_METHODS = ['credit_card', 'pix', 'boleto'] as const

type FormData = {
  name: string
  ref: string
  description: string
  admin_group: string
  active: boolean
  payment_methods: string[]
  webhook_url: string
  webhook_secret: string
}

function getEmptyFormData(): FormData {
  return {
    name: '',
    ref: '',
    description: '',
    admin_group: '',
    active: true,
    payment_methods: [...DEFAULT_PAYMENT_METHODS],
    webhook_url: '',
    webhook_secret: '',
  }
}

function productPricesForEditor(product: Product): Partial<Price>[] {
  return (product.prices || []).map((p) => {
    const upgrade_to_price_ids = [...(p.upgrade_paths ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((x) => x.to_price_id)
    const addon_price_ids = [...(p.addon_offers ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((x) => x.addon_price_id)
    const { upgrade_paths: _up, addon_offers: _ao, ...rest } = p
    return { ...rest, upgrade_to_price_ids, addon_price_ids }
  })
}

function productToFormData(product: Product): FormData {
  return {
    name: product.name,
    ref: product.ref,
    description: product.description || '',
    admin_group: getProductAdminGroupLabel(product.metadata),
    active: product.active,
    payment_methods: product.payment_methods || [...DEFAULT_PAYMENT_METHODS],
    webhook_url: product.webhook_url || '',
    webhook_secret: product.webhook_secret ? '••••••••' : '',
  }
}

type TabId = 'general' | 'policy' | 'prices' | 'emails' | 'webhook'

const CONTENT = {
  title: 'Editar produto',
  titleCreate: 'Novo produto',
  subtitle: 'Atualize as informações do produto',
  subtitleCreate: 'Preencha os dados do novo produto',
  tabs: {
    ariaLabel: 'Seções do produto',
    hasErrorsLabel: 'Possui erros',
    general: 'Geral',
    policy: 'Política de reembolso',
    prices: 'Preços',
    emails: 'Emails',
    webhook: 'Webhook',
  },
  sections: {
    productData: {
      title: 'Dados do produto',
      description: 'Nome, referência e descrição exibidos no checkout e no admin.',
    },
    adminGroup: {
      title: 'Organização no admin',
      description:
        'Agrupa este produto na lista de produtos (ex.: por plataforma). Não altera checkout nem APIs públicas.',
    },
    status: {
      title: 'Status e pagamento',
      description: 'Se o produto aparece no site e quais formas de pagamento você aceita.',
    },
    policyTab: {
      title: 'Política de reembolso',
      description:
        'Texto legal e condições exibidas ao cliente. Preencha com cuidado; isso afeta suporte e chargeback.',
    },
    pricesTab: {
      title: 'Planos e preços',
      description:
        'Cada preço é uma variação (ex.: mensal vs anual). Expanda um item para ver todas as opções agrupadas por assunto.',
    },
    emailsTab: {
      title: 'Emails transacionais',
      description:
        'Remetente, assunto e textos padrão. Complementos específicos por plano ficam na aba Preços.',
    },
  },
  webhook: {
    title: 'Webhook de pagamento confirmado',
    description:
      'Quando o pagamento for confirmado, enviamos um POST para a URL com o payload do pedido. O secret é usado para assinar o payload (HMAC-SHA256).',
    urlLabel: 'URL do webhook',
    urlPlaceholder: 'https://seu-sistema.com/api/webhook/payment',
    urlHint: 'URL que receberá o POST quando o pagamento for confirmado',
    secretLabel: 'Secret',
    secretPlaceholder: '••••••••••••••••',
    secretHint: 'Secret compartilhado para validar a assinatura do payload. Mantenha em sigilo.',
    secretShow: 'Mostrar',
    secretHide: 'Ocultar',
  },
  fields: {
    name: 'Nome do produto',
    namePlaceholder: 'Ex: Curso de programação',
    ref: 'Referência (identificador único)',
    refPlaceholder: 'Ex: curso-programacao-001',
    refHint: 'Identificador único usado nas URLs e integrações',
    description: 'Descrição',
    descriptionPlaceholder: 'Descrição detalhada do produto...',
    adminGroup: 'Grupo na lista (opcional)',
    adminGroupPlaceholder: 'Ex.: Hotmart, Kiwify, Site',
    adminGroupHint: 'Produtos com o mesmo texto aparecem juntos na página de produtos.',
    active: 'Produto ativo',
    activeHint: 'Produtos inativos não aparecem no checkout',
    paymentMethods: 'Métodos de pagamento aceitos',
  },
  paymentMethods: {
    credit_card: 'Cartão de crédito',
    pix: 'PIX',
    boleto: 'Boleto bancário',
    asaas_boleto_parcelado: 'Boleto parcelado (Asaas)',
  },
  buttons: {
    cancel: 'Cancelar',
    save: 'Salvar alterações',
    create: 'Criar produto',
    editWithAi: 'Editar com IA',
  },
  errors: {
    required: 'Campo obrigatório',
    save: 'Erro ao salvar. Tente novamente.',
  },
} as const

interface EditProductDialogProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onSave: (updated: Partial<Product>) => Promise<void>
  /** Catálogo completo para montar opções de add-on (outros produtos/preços). */
  catalogProducts: CatalogProductLite[]
}

export function EditProductDialog({
  product,
  open,
  onClose,
  onSave,
  catalogProducts,
}: EditProductDialogProps) {
  const [formData, setFormData] = useState<FormData>(getEmptyFormData)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicyContent | null>(null)
  const [emailConfig, setEmailConfig] = useState<ProductEmailConfig | null>(null)
  const [prices, setPrices] = useState<Partial<Price>[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [editWithAIOpen, setEditWithAIOpen] = useState(false)

  const isCreate = !product

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearError = useCallback((key: string) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }, [])

  useEffect(() => {
    if (product) {
      setFormData(productToFormData(product))
      setRefundPolicy((product.refund_policy as unknown as RefundPolicyContent) || null)
      setEmailConfig((product.email_config as unknown as ProductEmailConfig) || null)
      setPrices(productPricesForEditor(product))
    } else if (open) {
      setFormData(getEmptyFormData())
      setRefundPolicy(null)
      setEmailConfig(null)
      setPrices([])
    }
    if (open) setActiveTab('general')
  }, [product, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = CONTENT.errors.required
    }

    if (!formData.ref.trim()) {
      newErrors.ref = CONTENT.errors.required
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!isCreate && !product) return

    setIsSaving(true)
    try {
      const webhookSecretValue =
        formData.webhook_secret === '••••••••' ? undefined : formData.webhook_secret || null

      const metadata = mergeProductMetadataAdminGroup(
        isCreate ? null : product?.metadata,
        formData.admin_group
      )

      const data = {
        name: formData.name,
        ref: formData.ref,
        description: formData.description,
        active: formData.active,
        payment_methods: formData.payment_methods,
        refund_policy: refundPolicy as unknown as Product['refund_policy'],
        email_config: emailConfig as unknown as Product['email_config'],
        webhook_url: formData.webhook_url.trim() || null,
        ...(isCreate ? (metadata !== null ? { metadata } : {}) : { metadata }),
        ...(webhookSecretValue !== undefined && { webhook_secret: webhookSecretValue }),
      }
      await onSave(data as Partial<Product>)
      onClose()
    } catch (error) {
      devError('Erro ao salvar:', error)
      setErrors({ submit: CONTENT.errors.save })
    } finally {
      setIsSaving(false)
    }
  }

  const togglePaymentMethod = (method: string) => {
    setFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter((m) => m !== method)
        : [...prev.payment_methods, method],
    }))
  }

  const applyEditWithAI = useCallback((updatedProduct: Product) => {
    setFormData(productToFormData(updatedProduct))
    setRefundPolicy((updatedProduct.refund_policy as unknown as RefundPolicyContent) || null)
    setEmailConfig((updatedProduct.email_config as unknown as ProductEmailConfig) || null)
    setPrices(productPricesForEditor(updatedProduct))
  }, [])

  const [activeTab, setActiveTab] = useState<TabId>('general')

  const hasGeneralErrors = Boolean(errors.name || errors.ref || errors.submit)

  const tabs: {
    id: TabId
    label: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
    hasError?: boolean
  }[] = [
    { id: 'general', label: CONTENT.tabs.general, icon: Package, hasError: hasGeneralErrors },
    { id: 'policy', label: CONTENT.tabs.policy, icon: ShieldCheck },
    ...(!isCreate
      ? [{ id: 'prices' as TabId, label: CONTENT.tabs.prices, icon: Tag, count: prices.length }]
      : []),
    { id: 'emails', label: CONTENT.tabs.emails, icon: Mail },
    { id: 'webhook', label: CONTENT.tabs.webhook, icon: Webhook },
  ]

  const handleTabChange = (id: TabId) => {
    setActiveTab(id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title={isCreate ? CONTENT.titleCreate : CONTENT.title}
      description={isCreate ? CONTENT.subtitleCreate : CONTENT.subtitle}
      size="full"
      height="screen"
      scrollable={false}
      confirmText={isCreate ? CONTENT.buttons.create : CONTENT.buttons.save}
      cancelText={CONTENT.buttons.cancel}
      onConfirm={handleSave}
      onCancel={onClose}
      loading={isSaving}
      disableConfirm={isSaving}
      showIcon={false}
      contentPadding={null}
      headerActions={
        !isCreate && product ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditWithAIOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            {CONTENT.buttons.editWithAi}
          </Button>
        ) : undefined
      }
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col sm:flex-row">
        {/* Sidebar de navegação vertical (desktop) */}
        <nav
          aria-label={CONTENT.tabs.ariaLabel}
          className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3 sm:flex"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'h-9 w-full justify-between gap-2 px-3 font-medium',
                  isActive
                    ? 'bg-background text-foreground shadow-xs border border-border/70 hover:bg-background'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className="truncate">{tab.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {tab.hasError && (
                    <span
                      className="h-2 w-2 rounded-full bg-destructive"
                      aria-label={CONTENT.tabs.hasErrorsLabel}
                    />
                  )}
                  {typeof tab.count === 'number' && (
                    <Badge
                      variant={isActive ? 'secondary' : 'outline'}
                      className="h-5 min-w-5 justify-center px-1.5 text-[11px] font-medium tabular-nums"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </span>
              </Button>
            )
          })}
        </nav>

        {/* Nav mobile: linha horizontal sem position absolute */}
        <nav
          aria-label={CONTENT.tabs.ariaLabel}
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-muted/20 px-4 py-2.5 sm:hidden"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium',
                  isActive
                    ? 'border border-border/70 bg-background text-foreground shadow-xs hover:bg-background'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="rounded bg-muted px-1 text-[10px] tabular-nums">
                    {tab.count}
                  </span>
                )}
              </Button>
            )
          })}
        </nav>

        {/* Área de conteúdo com ScrollArea único */}
        <ScrollArea className="flex-1 min-h-0 min-w-0">
          <div className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-6 min-w-0">
            {activeTab === 'general' && (
              <>
                <AdminFormSection
                  title={CONTENT.sections.productData.title}
                  description={CONTENT.sections.productData.description}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="name">{CONTENT.fields.name} *</FieldLabel>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          updateField('name', e.target.value)
                          clearError('name')
                        }}
                        className={errors.name ? 'border-red-500' : ''}
                        placeholder={CONTENT.fields.namePlaceholder}
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="ref">{CONTENT.fields.ref} *</FieldLabel>
                      <Input
                        id="ref"
                        value={formData.ref}
                        onChange={(e) => {
                          updateField('ref', e.target.value)
                          clearError('ref')
                        }}
                        className={errors.ref ? 'border-red-500 font-mono' : 'font-mono'}
                        placeholder={CONTENT.fields.refPlaceholder}
                      />
                      {errors.ref && <p className="text-sm text-red-500">{errors.ref}</p>}
                      <FieldDescription>{CONTENT.fields.refHint}</FieldDescription>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="description">{CONTENT.fields.description}</FieldLabel>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                      placeholder={CONTENT.fields.descriptionPlaceholder}
                      className="min-h-[5rem] max-w-full resize-y"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="admin_group">{CONTENT.fields.adminGroup}</FieldLabel>
                    <Input
                      id="admin_group"
                      value={formData.admin_group}
                      onChange={(e) => updateField('admin_group', e.target.value)}
                      placeholder={CONTENT.fields.adminGroupPlaceholder}
                      className="min-w-0"
                    />
                    <FieldDescription>{CONTENT.fields.adminGroupHint}</FieldDescription>
                  </Field>
                </AdminFormSection>

                <AdminFormSection
                  title={CONTENT.sections.status.title}
                  description={CONTENT.sections.status.description}
                >
                  <div className="flex items-center justify-between gap-4 border-y border-border/60 py-3.5 min-w-0">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <FieldLabel htmlFor="active" className="text-sm font-medium">
                        {CONTENT.fields.active}
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground wrap-break-word">
                        {CONTENT.fields.activeHint}
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => updateField('active', checked)}
                      className="shrink-0"
                    />
                  </div>

                  <div className="space-y-3 min-w-0 pt-1">
                    <FieldLabel className="text-sm">{CONTENT.fields.paymentMethods}</FieldLabel>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 min-w-0">
                      {Object.entries(CONTENT.paymentMethods).map(([key, label]) => {
                        const checked = formData.payment_methods.includes(key)
                        return (
                          <label
                            key={key}
                            htmlFor={key}
                            className="flex cursor-pointer items-center gap-2.5 text-sm min-w-0"
                          >
                            <Checkbox
                              id={key}
                              checked={checked}
                              onCheckedChange={() => togglePaymentMethod(key)}
                              className="shrink-0"
                            />
                            <span className="font-medium leading-tight">{label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </AdminFormSection>

                {errors.submit && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'policy' && (
              <AdminFormSection
                title={CONTENT.sections.policyTab.title}
                description={CONTENT.sections.policyTab.description}
              >
                <RefundPolicyEditor value={refundPolicy} onChange={setRefundPolicy} />
              </AdminFormSection>
            )}

            {activeTab === 'prices' && !isCreate && (
              <AdminFormSection
                title={CONTENT.sections.pricesTab.title}
                description={CONTENT.sections.pricesTab.description}
              >
                <PricesEditor
                  prices={prices as unknown as Parameters<typeof PricesEditor>[0]['prices']}
                  onChange={(newPrices) => setPrices(newPrices as unknown as Partial<Price>[])}
                  productRef={formData.ref}
                  productId={product!.id}
                  catalogProducts={catalogProducts}
                />
              </AdminFormSection>
            )}

            {activeTab === 'emails' && (
              <AdminFormSection
                title={CONTENT.sections.emailsTab.title}
                description={CONTENT.sections.emailsTab.description}
              >
                <EmailConfigEditor value={emailConfig} onChange={setEmailConfig} />
              </AdminFormSection>
            )}

            {activeTab === 'webhook' && (
              <AdminFormSection
                title={CONTENT.webhook.title}
                description={CONTENT.webhook.description}
              >
                <Field>
                  <FieldLabel htmlFor="webhook_url">{CONTENT.webhook.urlLabel}</FieldLabel>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={(e) => updateField('webhook_url', e.target.value)}
                    placeholder={CONTENT.webhook.urlPlaceholder}
                    className="min-w-0"
                  />
                  <FieldDescription>{CONTENT.webhook.urlHint}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="webhook_secret">{CONTENT.webhook.secretLabel}</FieldLabel>
                  <div className="relative flex min-w-0">
                    <Input
                      id="webhook_secret"
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={formData.webhook_secret}
                      onChange={(e) => updateField('webhook_secret', e.target.value)}
                      placeholder={CONTENT.webhook.secretPlaceholder}
                      className="min-w-0 pr-10"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full shrink-0 px-3"
                      onClick={() => setShowWebhookSecret((v) => !v)}
                      aria-label={
                        showWebhookSecret ? CONTENT.webhook.secretHide : CONTENT.webhook.secretShow
                      }
                    >
                      {showWebhookSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FieldDescription>{CONTENT.webhook.secretHint}</FieldDescription>
                </Field>
              </AdminFormSection>
            )}
          </div>
        </ScrollArea>
      </div>

      {!isCreate && product && (
        <EditWithAIDialog
          open={editWithAIOpen}
          onOpenChange={setEditWithAIOpen}
          product={product}
          onApply={applyEditWithAI}
        />
      )}
    </Dialog>
  )
}
