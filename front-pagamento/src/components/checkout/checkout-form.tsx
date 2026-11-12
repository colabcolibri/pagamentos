'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { formatCNPJ, formatCPF, isValidCNPJ, isValidCPF } from '@brazilian-utils/brazilian-utils'
import { AlertCircle, Loader2, LogOut, Tag } from 'lucide-react'

import { AsaasBillingFields } from '@/components/checkout/asaas-billing-fields'
import type { CheckoutPromoCouponOverlay } from '@/components/checkout/checkout-price-steps'
import { scrollToFirstError, validateCheckoutForm } from '@/components/checkout/checkout-validation'
import { EmailAuthForm } from '@/components/payment/email-auth-form'
import { GatewaySelector } from '@/components/payment/gateway-selector'
import { RefundPolicyModal } from '@/components/refund-policy/refund-policy-modal'
import type { RefundPolicyContent } from '@/components/refund-policy/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { devLog } from '@/lib/dev-log'
import type { Product } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

import { type CouponPreviewPayload, resolveCouponPreviewAndOverlay } from './checkout-coupon-api'
import type { CheckoutFormData } from './checkout-form-content'
import { CHECKOUT_FORM_CONTENT } from './checkout-form-content'
import { RequiredFieldMark } from './required-field-mark'

const CONTENT = CHECKOUT_FORM_CONTENT

export type { CheckoutFormData }

function formatPercentBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}

function formatMoneyCentsBr(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function couponPaymentScopeLabel(appliesTo: string): string {
  const intro = CONTENT.coupon.validForPayment
  if (appliesTo === 'avista') return `${intro}: ${CONTENT.coupon.paymentAvista}`
  if (appliesTo === 'parcelado') return `${intro}: ${CONTENT.coupon.paymentParcelado}`
  return `${intro}: ${CONTENT.coupon.paymentBoth}`
}

/** Texto do benefício (% ou valor fixo configurado no cupom; fallback % efetivo). */
function couponBenefitLabel(preview: CouponPreviewPayload): string | null {
  if (preview.discount_type === 'fixed_cents' && preview.discount_fixed_amount_cents != null) {
    return CONTENT.coupon.discountFixedLabel.replace(
      '{amount}',
      formatMoneyCentsBr(preview.discount_fixed_amount_cents)
    )
  }
  if (preview.discount_percent_value != null && preview.discount_percent_value > 0) {
    return CONTENT.coupon.discountPercentLabel.replace(
      '{percent}',
      formatPercentBr(preview.discount_percent_value)
    )
  }
  if (preview.subtotal_cents > 0 && preview.discount_cents > 0) {
    const eff = Math.round((100 * preview.discount_cents) / preview.subtotal_cents)
    if (eff > 0) {
      return CONTENT.coupon.discountPercentLabel.replace('{percent}', String(eff))
    }
  }
  return null
}

/** Mesmo bloco visual do cupom válido: colapsado ou dentro do painel (edição). */
function CouponAppliedSummary({
  preview,
  showEditRemove,
  disabled,
  isLoading,
  onEdit,
  onRemove,
}: {
  preview: CouponPreviewPayload
  showEditRemove: boolean
  disabled?: boolean
  isLoading?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) {
  const benefit = couponBenefitLabel(preview)
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Tag className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <Badge variant="default" className="font-mono text-xs font-semibold uppercase shrink-0">
          {preview.normalized_code}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {couponPaymentScopeLabel(preview.applies_to)}
        </span>
        {showEditRemove ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              disabled={disabled || isLoading}
              onClick={onEdit}
            >
              {CONTENT.coupon.editCoupon}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              disabled={disabled || isLoading}
              onClick={onRemove}
            >
              {CONTENT.coupon.removeCoupon}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-6">
        {benefit ? (
          <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
            {benefit}
          </span>
        ) : null}
        {preview.public_remaining_line ? (
          <span className="text-xs text-muted-foreground">{preview.public_remaining_line}</span>
        ) : null}
        {preview.public_valid_until_line ? (
          <span className="text-xs text-muted-foreground">{preview.public_valid_until_line}</span>
        ) : null}
      </div>
    </div>
  )
}

interface CheckoutFormProps {
  product: Product
  priceId: string
  productName: string
  price: string
  installmentPrice?: string
  amountCents?: number
  refundPolicy: RefundPolicyContent
  onSubmit: (data: CheckoutFormData) => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
  /**
   * Fluxo controlado pelo pai (checkout). Quando definido, substitui o estado interno e deve ser atualizado via `onCheckoutFlowChange`.
   */
  checkoutFlow?: 'avista' | 'parcelado'
  /** Sincroniza fluxo Asaas (à vista vs parcelado) com o resumo de preço no checkout. */
  onCheckoutFlowChange?: (flow: 'avista' | 'parcelado') => void
  /** Oculta o card “Forma de pagamento” quando a escolha está no resumo de preço. */
  hidePaymentMethodCard?: boolean
  /**
   * Resumo de preço/promo na coluna direita: após login (antes dos dados), ou após cupom e antes da política.
   */
  priceSummary?: ReactNode
  /** Timer de desconto promocional, exibido antes do campo de cupom. */
  promoTimer?: ReactNode
  /** Sincroniza cartões de pagamento (CheckoutPromoSummary) com subtotal/final do cupom. */
  onCouponPromoOverlayChange?: (overlay: CheckoutPromoCouponOverlay | null) => void
  /** Após dados de faturamento e antes do preço cheio: troca de plano e opcionais (addons). */
  planChoices?: ReactNode
  /** IDs de add-on selecionados — entram no preview de cupom junto com o plano. */
  couponPreviewAddonPriceIds?: string[]
  /** Gateway usado nesta compra. Com os dois ativos, o checkout segue no Asaas. */
  paymentGateway?: 'pagarme' | 'asaas'
}

export function CheckoutForm({
  product: _product,
  priceId,
  productName: _productName,
  price: _price,
  installmentPrice: _installmentPrice,
  amountCents: _amountCents,
  refundPolicy,
  onSubmit,
  isLoading = false,
  disabled = false,
  checkoutFlow: checkoutFlowProp,
  onCheckoutFlowChange,
  hidePaymentMethodCard = false,
  priceSummary,
  promoTimer,
  onCouponPromoOverlayChange,
  planChoices,
  couponPreviewAddonPriceIds = [],
  paymentGateway = 'asaas',
}: CheckoutFormProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [formData, setFormData] = useState<Partial<CheckoutFormData>>({
    name: '',
    selectedGateway: paymentGateway,
    installments: 1,
    acceptedRefundPolicy: false,
    personType: 'fisica',
    couponCode: '',
  })
  const [internalCheckoutFlow, setInternalCheckoutFlow] = useState<'avista' | 'parcelado'>('avista')
  const flowControlled = checkoutFlowProp !== undefined
  const checkoutFlow = flowControlled ? checkoutFlowProp : internalCheckoutFlow

  useEffect(() => {
    setFormData((current) =>
      current.selectedGateway === paymentGateway
        ? current
        : { ...current, selectedGateway: paymentGateway }
    )
  }, [paymentGateway])

  const couponCodeRef = useRef(formData.couponCode)
  couponCodeRef.current = formData.couponCode

  const couponAddonKey = useMemo(
    () => [...couponPreviewAddonPriceIds].sort().join('|'),
    [couponPreviewAddonPriceIds]
  )

  useEffect(() => {
    const raw = (couponCodeRef.current ?? '').trim()
    if (!raw) return

    let cancelled = false
    void (async () => {
      setCouponChecking(true)
      setCouponPreviewError(null)
      try {
        const result = await resolveCouponPreviewAndOverlay(
          priceId,
          checkoutFlow,
          raw,
          couponPreviewAddonPriceIds.length > 0 ? couponPreviewAddonPriceIds : undefined
        )
        if (cancelled) return
        if (!result.ok) {
          setCouponPreview(null)
          onCouponPromoOverlayChange?.(null)
          setCouponPreviewError(result.error)
          return
        }
        setCouponPreview(result.preview)
        onCouponPromoOverlayChange?.(result.overlay)
      } catch {
        if (!cancelled) {
          setCouponPreview(null)
          onCouponPromoOverlayChange?.(null)
          setCouponPreviewError(CONTENT.coupon.invalid)
        }
      } finally {
        if (!cancelled) setCouponChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [checkoutFlow, priceId, onCouponPromoOverlayChange, couponAddonKey])

  useEffect(() => {
    if (!flowControlled) {
      onCheckoutFlowChange?.(internalCheckoutFlow)
    }
  }, [internalCheckoutFlow, onCheckoutFlowChange, flowControlled])
  const [couponPreview, setCouponPreview] = useState<CouponPreviewPayload | null>(null)
  const [couponPreviewError, setCouponPreviewError] = useState<string | null>(null)
  const [couponChecking, setCouponChecking] = useState(false)
  const [couponPanelOpen, setCouponPanelOpen] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({})
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/auth/session')
      const session = (await response.json().catch(() => null)) as {
        user?: { email?: string | null } | null
      } | null
      const email = session?.user?.email
      if (email) {
        setIsAuthenticated(true)
        setUserEmail(email)
        setFormData((prev) => ({ ...prev, email }))
        try {
          const res = await fetch('/api/profile')
          if (res.ok) {
            const data = await res.json()
            if (data.profile?.name) setFormData((prev) => ({ ...prev, name: data.profile.name }))
            if (data.profile?.phone) setFormData((prev) => ({ ...prev, phone: data.profile.phone }))
          }
        } catch {
          devLog('Não foi possível buscar perfil')
        }
      }
    }
    checkAuth()
  }, [])

  const handleAuthSuccess = async (email: string) => {
    setIsAuthenticated(true)
    setUserEmail(email)
    setFormData((prev) => ({ ...prev, email }))
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        if (data.profile?.name) setFormData((prev) => ({ ...prev, name: data.profile.name }))
        if (data.profile?.phone) setFormData((prev) => ({ ...prev, phone: data.profile.phone }))
      }
    } catch {
      devLog('Não foi possível buscar perfil')
    }
  }

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateFullNameOnBlur = (field: 'name' | 'razaoSocial') => {
    const msg = CONTENT.validation.fullNameTwoWords
    if (field === 'name') {
      if (formData.personType === 'juridica') return
      const s = formData.name?.trim() ?? ''
      if (s.length >= 3 && s.split(/\s+/).filter(Boolean).length < 2) {
        setErrors((prev) => ({ ...prev, name: msg }))
      }
      return
    }
    if (formData.personType !== 'juridica') return
    const s = formData.razaoSocial?.trim() ?? ''
    if (s.length > 0 && s.split(/\s+/).filter(Boolean).length < 2) {
      setErrors((prev) => ({ ...prev, razaoSocial: msg }))
    }
  }

  const handleCpfChange = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '')
    handleInputChange('cpf', formatCPF(clean))
    if (clean.length === 11) {
      setErrors((prev) => ({
        ...prev,
        cpf: isValidCPF(clean) ? undefined : CONTENT.validation.cpfInvalid,
      }))
    }
  }

  const handleCnpjChange = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '')
    handleInputChange('cnpj', formatCNPJ(clean))
    if (clean.length === 14) {
      setErrors((prev) => ({
        ...prev,
        cnpj: isValidCNPJ(clean) ? undefined : CONTENT.validation.cnpjInvalid,
      }))
    }
  }

  const handleValidateAndSubmit = async (flowOverride?: 'avista' | 'parcelado') => {
    const flow = flowOverride ?? checkoutFlow
    const { valid, errors: nextErrors } = validateCheckoutForm({
      refundPolicyAcceptanceRequired: refundPolicy.checkout.acceptanceRequired,
      formData,
      userEmail,
      selectedGateway: paymentGateway,
      installments: flow === 'parcelado' ? 12 : 1,
    })
    setErrors(nextErrors)
    if (!valid) {
      scrollToFirstError()
      devLog('Formulário inválido. Erros:', nextErrors)
      return
    }
    await onSubmit({
      ...formData,
      email: userEmail,
      name: formData.name!,
      selectedGateway: paymentGateway,
      checkoutFlow: flow,
      billingType: 'UNDEFINED',
      installments: flow === 'parcelado' ? undefined : 1,
      acceptedRefundPolicy: formData.acceptedRefundPolicy!,
      couponCode: (formData.couponCode ?? '').trim() || undefined,
    } as CheckoutFormData)
  }

  const handleFlowChange = (newFlow: 'avista' | 'parcelado') => {
    if (!flowControlled) {
      setInternalCheckoutFlow(newFlow)
    }
    onCheckoutFlowChange?.(newFlow)
    setCouponPanelOpen(false)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setUserEmail('')
    setFormData({
      name: '',
      selectedGateway: paymentGateway,
      installments: 1,
      acceptedRefundPolicy: false,
      personType: 'fisica',
      couponCode: '',
    })
    setCouponPreview(null)
    setCouponPreviewError(null)
    setCouponPanelOpen(false)
    onCouponPromoOverlayChange?.(null)
  }

  const handleCouponPreview = async () => {
    const raw = (formData.couponCode ?? '').trim()
    setCouponPreview(null)
    setCouponPreviewError(null)
    onCouponPromoOverlayChange?.(null)
    if (!raw) return
    setCouponChecking(true)
    try {
      const result = await resolveCouponPreviewAndOverlay(
        priceId,
        checkoutFlow,
        raw,
        couponPreviewAddonPriceIds.length > 0 ? couponPreviewAddonPriceIds : undefined
      )
      if (!result.ok) {
        setCouponPreviewError(result.error)
        return
      }
      setCouponPreview(result.preview)
      onCouponPromoOverlayChange?.(result.overlay)
      if (result.normalizedCode) {
        handleInputChange('couponCode', result.normalizedCode)
      }
      setCouponPanelOpen(false)
    } catch {
      setCouponPreviewError(CONTENT.coupon.invalid)
    } finally {
      setCouponChecking(false)
    }
  }

  const handleRemoveCoupon = () => {
    handleInputChange('couponCode', '')
    setCouponPreview(null)
    setCouponPreviewError(null)
    setCouponPanelOpen(false)
    onCouponPromoOverlayChange?.(null)
  }

  useEffect(() => {
    if (couponPanelOpen) {
      const id = requestAnimationFrame(() => {
        document.getElementById('coupon-code')?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [couponPanelOpen])

  return (
    <div className="space-y-4 md:space-y-6">
      {!isAuthenticated && (
        <Card>
          <CardContent className="pt-6">
            <EmailAuthForm onSuccess={handleAuthSuccess} disabled={disabled || isLoading} />
          </CardContent>
        </Card>
      )}

      {isAuthenticated && (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="space-y-2 px-4 py-3 sm:px-6 sm:py-3.5">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {CONTENT.steps.data.title}
              </h3>
              <Field className="min-w-0 w-full" data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">{CONTENT.fields.email}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="email"
                    type="email"
                    value={userEmail}
                    disabled
                    placeholder={CONTENT.fields.emailLocked}
                    aria-label={CONTENT.fields.emailLocked}
                    className="min-w-0"
                  />
                  <InputGroupAddon align="inline-end" className="shrink-0 pr-1 sm:pr-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                      onClick={handleLogout}
                      disabled={disabled || isLoading}
                    >
                      <LogOut className="mr-1 h-4 w-4 shrink-0 sm:mr-1.5" aria-hidden />
                      {CONTENT.logout.button}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{errors.email}</FieldError>
              </Field>
            </CardContent>
          </Card>

          <AsaasBillingFields
            formData={formData}
            errors={errors}
            onFieldChange={handleInputChange}
            onCpfChange={handleCpfChange}
            onCnpjChange={handleCnpjChange}
            onFieldBlur={(field) => {
              if (field === 'name') validateFullNameOnBlur('name')
              if (field === 'razaoSocial') validateFullNameOnBlur('razaoSocial')
            }}
            disabled={disabled}
            isLoading={isLoading}
            isLoadingCep={isLoadingCep}
            setLoadingCep={setIsLoadingCep}
            onCepError={(msg) => setErrors((prev) => ({ ...prev, cep: msg ?? undefined }))}
          />

          {promoTimer ? <div className="min-w-0">{promoTimer}</div> : null}
        </>
      )}

      {planChoices ? <div className="min-w-0">{planChoices}</div> : null}

      {priceSummary ? (
        <section
          className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm ring-1 ring-border/40 sm:p-5"
          aria-labelledby="checkout-payment-values-heading"
        >
          <div className="mb-4 min-w-0 space-y-1 border-b border-border/50 pb-4">
            <h3
              id="checkout-payment-values-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {CONTENT.paymentValuesSection.title}
            </h3>
            {CONTENT.paymentValuesSection.hint ? (
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {CONTENT.paymentValuesSection.hint}
              </p>
            ) : null}
          </div>
          <div className="min-w-0">{priceSummary}</div>
        </section>
      ) : null}

      {isAuthenticated && (
        <>
          <div
            className={cn(
              'min-w-0 overflow-hidden transition-[box-shadow,border-color,background-color]',
              couponPanelOpen &&
                'rounded-xl border border-border/80 bg-card p-4 shadow-md sm:p-5 dark:border-border',
              !couponPanelOpen &&
                couponPreview?.ok &&
                'rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5',
              !couponPanelOpen &&
                !couponPreview?.ok &&
                'rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2'
            )}
          >
            {!couponPanelOpen && couponPreview?.ok ? (
              <CouponAppliedSummary
                preview={couponPreview}
                showEditRemove
                disabled={disabled}
                isLoading={isLoading}
                onEdit={() => setCouponPanelOpen(true)}
                onRemove={handleRemoveCoupon}
              />
            ) : null}

            {!couponPanelOpen && !couponPreview?.ok ? (
              <button
                type="button"
                className="group flex items-baseline gap-1.5 text-left"
                disabled={disabled || isLoading}
                onClick={() => setCouponPanelOpen(true)}
              >
                <span className="text-sm text-muted-foreground">
                  {CONTENT.coupon.toggleQuestion}
                </span>
                <span className="text-sm font-semibold text-primary underline-offset-4 group-hover:underline">
                  {CONTENT.coupon.toggleAction}
                </span>
              </button>
            ) : null}

            {couponPanelOpen ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Tag className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{CONTENT.coupon.label}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 self-start text-muted-foreground sm:self-center"
                    disabled={disabled || isLoading || couponChecking}
                    onClick={() => {
                      setCouponPanelOpen(false)
                      if (!couponPreview?.ok) {
                        handleInputChange('couponCode', '')
                        setCouponPreviewError(null)
                      }
                    }}
                  >
                    {CONTENT.coupon.closePanel}
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor="coupon-code" className="sr-only">
                      {CONTENT.coupon.label}
                    </FieldLabel>
                    <InputGroup className="min-h-10 rounded-lg">
                      <InputGroupInput
                        id="coupon-code"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        value={formData.couponCode ?? ''}
                        onChange={(e) => {
                          handleInputChange('couponCode', e.target.value)
                          setCouponPreview(null)
                          setCouponPreviewError(null)
                          onCouponPromoOverlayChange?.(null)
                        }}
                        placeholder={CONTENT.coupon.placeholder}
                        disabled={disabled || isLoading}
                        className="h-10 uppercase"
                      />
                    </InputGroup>
                  </Field>
                  <Button
                    type="button"
                    variant="default"
                    className="h-10 w-full shrink-0 sm:w-auto sm:min-w-30"
                    disabled={
                      disabled || isLoading || couponChecking || !(formData.couponCode ?? '').trim()
                    }
                    onClick={() => void handleCouponPreview()}
                  >
                    {couponChecking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {CONTENT.coupon.applying}
                      </>
                    ) : (
                      CONTENT.coupon.apply
                    )}
                  </Button>
                </div>
                {couponPreviewError && (
                  <p className="text-sm text-destructive flex items-start gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {couponPreviewError}
                  </p>
                )}
                {couponPreview?.ok && couponPanelOpen ? (
                  <div
                    className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5"
                    role="status"
                  >
                    <CouponAppliedSummary
                      preview={couponPreview}
                      showEditRemove={false}
                      disabled={disabled}
                      isLoading={isLoading}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {!hidePaymentMethodCard ? (
            <GatewaySelector
              checkoutFlow={checkoutFlow}
              onFlowChange={handleFlowChange}
              disabled={disabled || isLoading}
            />
          ) : null}

          <Card className="border-2 border-primary/10 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="shrink-0 mt-0.5">
                    {formData.acceptedRefundPolicy ? (
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-success-foreground"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-primary/30 bg-background" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1 inline-flex flex-wrap items-baseline gap-0">
                      <span>
                        {formData.acceptedRefundPolicy
                          ? CONTENT.policy.titleAccepted
                          : CONTENT.policy.title}
                      </span>
                      {!formData.acceptedRefundPolicy ? (
                        <RequiredFieldMark className="ml-0.5 shrink-0" />
                      ) : null}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {formData.acceptedRefundPolicy
                        ? CONTENT.policy.descriptionAccepted
                        : CONTENT.policy.description}
                    </p>
                    <Button
                      type="button"
                      variant={formData.acceptedRefundPolicy ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => setShowPolicyModal(true)}
                      disabled={disabled || isLoading}
                      className={
                        formData.acceptedRefundPolicy
                          ? 'border-success text-success hover:bg-success/10'
                          : ''
                      }
                    >
                      {formData.acceptedRefundPolicy
                        ? CONTENT.policy.buttonAccepted
                        : refundPolicy.checkout.buttonText}
                    </Button>
                  </div>
                </div>
                {errors.acceptedRefundPolicy && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 md:p-4">
                    <p className="text-sm text-destructive flex items-center gap-2 md:gap-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errors.acceptedRefundPolicy}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                type="button"
                onClick={() => void handleValidateAndSubmit()}
                disabled={disabled || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {CONTENT.submit.processing}
                  </>
                ) : (
                  CONTENT.submit.button
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <RefundPolicyModal
        open={showPolicyModal}
        onOpenChange={setShowPolicyModal}
        policy={refundPolicy}
        confirmText={refundPolicy.checkout.acceptanceText}
        onConfirm={() => {
          handleInputChange('acceptedRefundPolicy', true)
          if (errors.acceptedRefundPolicy) {
            setErrors((prev) => ({ ...prev, acceptedRefundPolicy: undefined }))
          }
        }}
        showConfirmButton={true}
      />
    </div>
  )
}
