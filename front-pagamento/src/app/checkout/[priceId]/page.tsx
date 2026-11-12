'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

import { useBrand } from '@/components/brand/brand-provider'
import type { CheckoutFormData } from '@/components/checkout/checkout-form'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { CheckoutOrderPanel } from '@/components/checkout/checkout-order-panel'
import { CheckoutPlanChoices } from '@/components/checkout/checkout-plan-choices'
import type { CheckoutPromoCouponOverlay } from '@/components/checkout/checkout-price-steps'
import { checkoutPromoLabelsFromPriceMetadata } from '@/components/checkout/checkout-promo-labels'
import { CheckoutPromoTimerSection } from '@/components/checkout/checkout-promo-offer'
import { CheckoutPromoSummary } from '@/components/checkout/checkout-promo-summary'
import { TrustIndicators } from '@/components/checkout/trust-indicators'
import { PageContainer } from '@/components/layout/page-container'
import { PublicFooter } from '@/components/layout/public-footer'
import { PublicHeader, PublicHeaderAuthActions } from '@/components/layout/public-header'
import { PaymentStatus } from '@/components/payment/payment-status'
import type { PriceTopicSection } from '@/components/price-topics/types'
import type { RefundPolicyContent } from '@/components/refund-policy/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useProductByPriceId } from '@/hooks/use-product-price'
import { estimateAddonCents } from '@/lib/checkout/addon-estimate'
import { getAddonOfferDisplay } from '@/lib/checkout/addon-offer-display'
import { checkoutProductAndPlanLine } from '@/lib/checkout/offer-display'
import { devError, devLog } from '@/lib/dev-log'
import type { Price } from '@/lib/payments/product'
import { cn } from '@/lib/utils'

const CONTENT = {
  back: 'Voltar',
  loading: 'Carregando produto...',
  page: {
    title: 'Finalizar compra',
    subtitle: 'Confirme seus dados e escolha a forma de pagamento',
  },
  product: {
    priceLabel: 'Valor total',
    installmentsPrefix: 'ou',
    whatIncluded: 'O que está incluso',
  },
  error: {
    title: 'Erro ao carregar produto',
    notFound: 'Produto não encontrado',
    generic: 'Ocorreu um erro ao carregar o produto',
    retry: 'Tentar novamente',
    missingPolicy: 'Configuração incompleta',
    missingPolicyDescription: 'Este produto não possui uma política de reembolso configurada.',
  },
  success: {
    title: 'Pagamento iniciado!',
    message: 'Pagamento processado com sucesso',
    confirmed: 'Pagamento confirmado!',
  },
  errorPayment: {
    title: 'Erro no pagamento',
  },
  console: {
    checkoutStart: 'Iniciando checkout:',
    paymentCreated: 'Pagamento criado:',
    paymentError: 'Erro ao criar pagamento:',
    paymentConfirmed: 'Pagamento confirmado!',
  },
  footer: {
    supportHint: 'Dúvidas sobre esta compra? Use o botão "Fale conosco" no canto da tela.',
  },
  crossSell: {
    currentPlan: 'Selecionado',
    changePlan: 'Nível acima disponível',
    upgradeTagline: 'Acesso ampliado, mesmo pagamento. O total atualiza ao selecionar.',
    upgradeHelp: '',
    upgradeCatalogHint: '',
    upgradeDiffMoreSuffix: 'a mais',
    upgradeDiffLessSuffix: 'a menos',
    upgradeDiffSame: 'Mesmo valor',
    selectPlan: 'Clique aqui para selecionar',
    revertPlan: 'Voltar ao que estava selecionado',
    addonTitle: 'Adicionar ao pedido',
    addonHint: 'Entra no mesmo pagamento. Você pode desmarcar antes de confirmar.',
    addonUnavailable: 'Indisponível no momento.',
    viewDetails: 'Ver o que inclui',
    totalLabel: 'Total',
    extrasSubtotal: 'Opcionais',
  },
} as const

export default function CheckoutPage({ params }: { params: Promise<{ priceId: string }> }) {
  const { priceId } = use(params)
  const router = useRouter()
  const brand = useBrand()
  const originalPriceIdRef = useRef(priceId)

  const [showPaymentStatus, setShowPaymentStatus] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)
  const [gatewayAvailability, setGatewayAvailability] = useState<{
    asaas: boolean
    pagarme: boolean
  } | null>(null)
  const selectedGateway: 'pagarme' | 'asaas' | null =
    gatewayAvailability == null
      ? null
      : gatewayAvailability.asaas
        ? 'asaas'
        : gatewayAvailability.pagarme
          ? 'pagarme'
          : null
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1)
  const [selectedBillingType, setSelectedBillingType] = useState<string>('UNDEFINED')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [forceNewOnNextSubmit, setForceNewOnNextSubmit] = useState(false)
  const [chargedAmountCents, setChargedAmountCents] = useState<number | null>(null)
  const [checkoutFlowUi, setCheckoutFlowUi] = useState<'avista' | 'parcelado'>('avista')
  const [couponPromoOverlay, setCouponPromoOverlay] = useState<CheckoutPromoCouponOverlay | null>(
    null
  )
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])

  useEffect(() => {
    setCouponPromoOverlay(null)
  }, [priceId])

  useEffect(() => {
    let cancelled = false
    fetch('/api/payments/gateways')
      .then((response) => (response.ok ? response.json() : { asaas: false, pagarme: false }))
      .then((data: { asaas?: boolean; pagarme?: boolean }) => {
        if (!cancelled) {
          setGatewayAvailability({ asaas: Boolean(data.asaas), pagarme: Boolean(data.pagarme) })
        }
      })
      .catch(() => {
        if (!cancelled) setGatewayAvailability({ asaas: false, pagarme: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSelectedAddonIds([])
  }, [priceId])

  // Buscar produto pelo price ID
  const { data: productData, isLoading, error, refetch } = useProductByPriceId(priceId)

  const checkoutPromoLabels = useMemo(() => {
    const meta = productData?.prices?.find((p) => p.id === priceId)?.metadata
    return checkoutPromoLabelsFromPriceMetadata(
      (meta as Record<string, unknown> | null | undefined) ?? null
    )
  }, [productData?.prices, priceId])

  const selectedPrice = useMemo((): Price | undefined => {
    if (!productData?.prices?.length) return undefined
    return productData.prices.find((p) => p.id === priceId) ?? productData.prices[0]
  }, [productData, priceId])

  const upgradeTargets = useMemo(() => {
    const paths = selectedPrice?.upgrade_paths ?? []
    return [...paths]
      .filter((p) => p.to_price?.id && p.to_price.active)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [selectedPrice?.upgrade_paths])

  const addonOffers = useMemo(() => {
    const offers = selectedPrice?.addon_offers ?? []
    return [...offers]
      .filter((o) => o.addon_price?.id && o.addon_price.active)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [selectedPrice?.addon_offers])

  const showAddonSection =
    !!selectedPrice &&
    !selectedPrice.recurring &&
    addonOffers.length > 0 &&
    selectedGateway === 'asaas'

  const selectedAddonLineItems = useMemo(() => {
    if (!showAddonSection || selectedAddonIds.length === 0 || !productData) return []
    const anchor = productData.name
    const items: { label: string; cents: number }[] = []
    for (const id of selectedAddonIds) {
      const offer = addonOffers.find((o) => o.addon_price_id === id)
      const ap = offer?.addon_price
      if (!offer || !ap) continue
      const cents = estimateAddonCents(ap, checkoutFlowUi)
      if (cents == null || cents <= 0) continue
      const title = getAddonOfferDisplay(offer, anchor).title.trim()
      items.push({ label: title.length > 0 ? title : 'Opcional', cents })
    }
    return items
  }, [addonOffers, checkoutFlowUi, productData, selectedAddonIds, showAddonSection])

  const selectedAddonsExtraCents = useMemo(
    () => selectedAddonLineItems.reduce((s, x) => s + x.cents, 0),
    [selectedAddonLineItems]
  )

  const toggleAddon = useCallback((addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((x) => x !== addonId) : [...prev, addonId]
    )
  }, [])

  const selectPlanPriceId = useCallback(
    (nextPriceId: string) => {
      if (!nextPriceId || nextPriceId === priceId) return
      router.replace(`/checkout/${nextPriceId}`, { scroll: false })
    },
    [priceId, router]
  )

  const topicSections = useMemo((): PriceTopicSection[] => {
    if (!productData?.prices?.[0]) return []
    const meta = productData.prices[0].metadata as { topics?: PriceTopicSection[] } | null
    return Array.isArray(meta?.topics) ? meta.topics : []
  }, [productData])

  const mainLineCents = useMemo(() => {
    if (!selectedPrice) return null
    const est = estimateAddonCents(selectedPrice, checkoutFlowUi)
    if (est != null) return est
    return typeof selectedPrice.amount === 'number' ? selectedPrice.amount : null
  }, [selectedPrice, checkoutFlowUi])

  const handleCheckoutSubmit = async (formData: CheckoutFormData) => {
    if (!productData || !selectedGateway) return

    setIsProcessing(true)
    setResult(null)

    try {
      devLog(CONTENT.console.checkoutStart, {
        product: checkoutProductAndPlanLine(productData.name, productData.prices[0]),
        formData,
      })

      const isAsaas = formData.selectedGateway === 'asaas'
      const flow = formData.checkoutFlow ?? 'avista'
      const endpoint = isAsaas
        ? flow === 'parcelado'
          ? '/api/payments/asaas/checkout/parcelado'
          : '/api/payments/asaas/checkout/avista'
        : '/api/payments/pagarme/checkout'

      const customerInfo = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        person_type: formData.personType,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        razao_social: formData.razaoSocial,
        ie: formData.ie,
        im: formData.im,
        cep: formData.cep,
        address: formData.address,
        address_number: formData.addressNumber,
        complement: formData.complement,
        province: formData.province,
        city: formData.city,
        state: formData.state,
      }

      const body: Record<string, unknown> = {
        price_id: productData.prices[0]?.id,
        force_new: forceNewOnNextSubmit,
        customer_info: customerInfo,
      }
      if (isAsaas && selectedAddonIds.length > 0) {
        body.addon_price_ids = selectedAddonIds
      }
      const couponTrim = formData.couponCode?.trim()
      if (couponTrim) {
        body.coupon_code = couponTrim
      }
      if (!isAsaas) {
        body.billing_type = formData.billingType ?? 'BOLETO'
        body.installments = formData.installments ?? 1
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      let data: Record<string, unknown> = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text) as Record<string, unknown>
        }
      } catch {
        data = {}
      }

      if (!response.ok) {
        const raw =
          (typeof data.error === 'string' && data.error) ||
          (typeof data.message === 'string' && data.message) ||
          ''
        const fallback = `Não foi possível criar o pagamento (${response.status}). Tente de novo.`
        throw new Error(raw.trim() || fallback)
      }

      devLog(CONTENT.console.paymentCreated, data)

      const okPayload = data as {
        charged_amount_cents?: unknown
        payment_link_url?: unknown
        payment_id?: unknown
        payment?: { invoice_url?: unknown; bank_slip_url?: unknown; id?: unknown }
      }

      const chargedRaw = okPayload.charged_amount_cents
      setChargedAmountCents(
        typeof chargedRaw === 'number' && Number.isFinite(chargedRaw)
          ? chargedRaw
          : (productData.prices[0]?.amount ?? null)
      )

      const pay = okPayload.payment
      const linkUrl =
        (typeof okPayload.payment_link_url === 'string' && okPayload.payment_link_url) ||
        (typeof pay?.invoice_url === 'string' && pay.invoice_url) ||
        (typeof pay?.bank_slip_url === 'string' && pay.bank_slip_url) ||
        null
      setPaymentId(
        (typeof okPayload.payment_id === 'string' && okPayload.payment_id) ||
          (typeof pay?.id === 'string' && pay.id) ||
          null
      )
      setPaymentLinkUrl(linkUrl)
      setSelectedInstallments(formData.installments || 1)
      setSelectedBillingType(formData.checkoutFlow === 'parcelado' ? 'CREDIT_CARD' : 'PIX')
      setForceNewOnNextSubmit(false)
      setShowPaymentStatus(true)
      if (typeof window !== 'undefined' && linkUrl) {
        window.open(linkUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      devError(CONTENT.console.paymentError, err)
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Extrair política de reembolso da coluna dedicada
  const refundPolicy = productData?.refund_policy as RefundPolicyContent | null

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" aria-hidden />
          <p className="text-muted-foreground">{CONTENT.loading}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !productData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.error.title}
            </h2>
            <p className="text-muted-foreground mb-4">
              {error ? CONTENT.error.generic : CONTENT.error.notFound}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} variant="outline">
                {CONTENT.error.retry}
              </Button>
              <Link href="/">
                <Button>{CONTENT.back}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Missing refund policy
  if (!refundPolicy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-foreground mb-2">
              {CONTENT.error.missingPolicy}
            </h2>
            <p className="text-muted-foreground mb-4">{CONTENT.error.missingPolicyDescription}</p>
            <Link href="/">
              <Button>{CONTENT.back}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const priceCurrency = productData.prices[0]?.currency || 'BRL'
  const checkoutOfferLabel = checkoutProductAndPlanLine(productData.name, selectedPrice)

  const maxInstallmentsForCheckout = (() => {
    const meta = selectedPrice?.metadata as Record<string, unknown> | null
    const raw = meta?.max_installments
    const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
    return !isNaN(parsed) && parsed >= 1 ? parsed : 1
  })()

  const installmentsSummaryLine = (() => {
    const prefix = CONTENT.product.installmentsPrefix
    const baseTag = productData.formattedInstallmentsTag?.trim()
    const parc = couponPromoOverlay?.parcelado
    /** Cupom: `final_cents` da API já inclui opcionais quando enviados no preview. */
    const addonOnTop =
      parc && parc.discountCents > 0 && selectedAddonsExtraCents > 0 ? 0 : selectedAddonsExtraCents
    const formatPer = (totalParcCents: number) => {
      const per = Math.round(totalParcCents / maxInstallmentsForCheckout)
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: priceCurrency.toUpperCase(),
      }).format(per / 100)
      return `${prefix} ${maxInstallmentsForCheckout}x de ${formatted}`.trim()
    }
    if (couponPromoOverlay?.parcelado && maxInstallmentsForCheckout > 1) {
      return formatPer(couponPromoOverlay.parcelado.finalCents + addonOnTop)
    }
    // Sem cupom no parcelado: mesma base do card (lista parcelado + opcionais), não só a tag do plano.
    const priceUi = productData.priceUi
    if (priceUi && maxInstallmentsForCheckout > 1) {
      const totalParc = priceUi.parcelado.promoListCents + selectedAddonsExtraCents
      return formatPer(totalParc)
    }
    return baseTag ? `${prefix} ${baseTag}`.trim() : null
  })()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <PublicHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 max-w-full">
            <Link href="/" className="shrink-0">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                {CONTENT.back}
              </Button>
            </Link>
            <PublicHeaderAuthActions />
          </div>
        }
      />

      {/* Main */}
      <main className="flex-1">
        <PageContainer className="py-8 md:py-12">
          {/* Page Header */}
          <div className="mb-8 md:mb-12 space-y-2">
            <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {CONTENT.page.title}
            </h1>
            <p className="text-muted-foreground">{CONTENT.page.subtitle}</p>
          </div>

          <div
            className={cn(
              'grid min-w-0 grid-cols-1 gap-8 lg:items-start lg:gap-10',
              showPaymentStatus ? '' : 'lg:grid-cols-[35fr_65fr]'
            )}
          >
            {/* Esquerda: resumo (~35%) — rola com a página (sem sticky) */}
            {!showPaymentStatus ? (
              <CheckoutOrderPanel
                className="min-w-0 w-full"
                productName={productData.name}
                productDescription={productData.description}
                selectedPrice={selectedPrice}
                priceCurrency={priceCurrency}
                priceUi={productData.priceUi ?? null}
                checkoutPromoLabels={checkoutPromoLabels}
                formattedPrice={productData.formattedPrice || ''}
                installmentsSummaryLine={installmentsSummaryLine}
                mainLineCents={mainLineCents}
                selectedAddonsExtraCents={selectedAddonsExtraCents}
                topicSections={topicSections}
                copy={{
                  priceLabel: CONTENT.product.priceLabel,
                  whatIncluded: CONTENT.product.whatIncluded,
                  totalLabel: CONTENT.crossSell.totalLabel,
                  extrasSubtotal: CONTENT.crossSell.extrasSubtotal,
                }}
              />
            ) : null}

            {/* Direita: formulário / status (~65%) */}
            <div className="min-w-0 w-full space-y-4 md:space-y-6">
              {showPaymentStatus ? (
                <PaymentStatus
                  paymentId={paymentId}
                  paymentLinkUrl={paymentLinkUrl}
                  gateway={selectedGateway ?? 'asaas'}
                  productName={checkoutOfferLabel}
                  amount={chargedAmountCents ?? productData.prices[0]?.amount}
                  installments={selectedInstallments}
                  billingType={selectedBillingType}
                  successMessage={
                    (productData.prices[0]?.metadata as Record<string, unknown>)?.success_message
                      ? String(
                          (productData.prices[0]?.metadata as Record<string, unknown>)
                            .success_message
                        ).trim()
                      : (productData.metadata as Record<string, unknown>)?.success_message
                        ? String(
                            (productData.metadata as Record<string, unknown>).success_message
                          ).trim()
                        : undefined
                  }
                  onSuccess={() => {
                    devLog(CONTENT.console.paymentConfirmed)
                    setResult({
                      success: true,
                      message: CONTENT.success.message,
                    })
                    router.replace(
                      '/checkout/confirmation?' +
                        [
                          `product_name=${encodeURIComponent(checkoutOfferLabel)}`,
                          paymentId && `payment_id=${encodeURIComponent(paymentId)}`,
                          `gateway=${encodeURIComponent(selectedGateway ?? 'asaas')}`,
                        ]
                          .filter(Boolean)
                          .join('&')
                    )
                  }}
                  onBack={() => {
                    setShowPaymentStatus(false)
                    setPaymentId(null)
                    setPaymentLinkUrl(null)
                    setSelectedBillingType('UNDEFINED')
                    setResult(null)
                    setChargedAmountCents(null)
                    setForceNewOnNextSubmit(true)
                  }}
                />
              ) : (
                // Formulário de checkout
                <>
                  <TrustIndicators className="w-full" privacyPolicyHref={brand.privacyUrl} />
                  {selectedGateway == null && gatewayAvailability != null ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                      Nenhum meio de pagamento está ativo. A compra fica bloqueada até um gateway
                      ser configurado.
                    </div>
                  ) : null}
                  <CheckoutForm
                    product={productData}
                    paymentGateway={selectedGateway ?? 'asaas'}
                    disabled={isProcessing || selectedGateway == null}
                    priceId={productData.prices[0]?.id}
                    productName={checkoutOfferLabel}
                    price={productData.formattedPrice || ''}
                    installmentPrice={productData.formattedInstallmentsTag}
                    amountCents={productData.prices[0]?.amount}
                    checkoutFlow={checkoutFlowUi}
                    onCheckoutFlowChange={setCheckoutFlowUi}
                    couponPreviewAddonPriceIds={selectedAddonIds}
                    hidePaymentMethodCard={!!productData.priceUi}
                    promoTimer={
                      productData.priceUi ? (
                        <CheckoutPromoTimerSection
                          display={productData.priceUi}
                          labels={checkoutPromoLabels}
                        />
                      ) : undefined
                    }
                    priceSummary={
                      productData.priceUi ? (
                        <CheckoutPromoSummary
                          display={productData.priceUi}
                          flow={checkoutFlowUi}
                          currency={priceCurrency}
                          installmentsLine={installmentsSummaryLine}
                          labels={checkoutPromoLabels}
                          onSelectFlow={setCheckoutFlowUi}
                          choiceDisabled={isProcessing}
                          showOfferSection={false}
                          couponOverlay={couponPromoOverlay}
                          addonExtraCents={selectedAddonsExtraCents}
                          addonLineItems={selectedAddonLineItems}
                        />
                      ) : undefined
                    }
                    refundPolicy={refundPolicy}
                    onSubmit={handleCheckoutSubmit}
                    isLoading={isProcessing}
                    onCouponPromoOverlayChange={setCouponPromoOverlay}
                    planChoices={
                      upgradeTargets.length > 0 || showAddonSection ? (
                        <CheckoutPlanChoices
                          anchorProductName={productData.name}
                          selectedPrice={selectedPrice}
                          originalPriceId={originalPriceIdRef.current}
                          priceCurrency={priceCurrency}
                          checkoutFlowUi={checkoutFlowUi}
                          upgradeTargets={upgradeTargets}
                          onSelectPlanPriceId={selectPlanPriceId}
                          addonOffers={addonOffers}
                          showAddonSection={showAddonSection}
                          selectedAddonIds={selectedAddonIds}
                          toggleAddon={toggleAddon}
                          disabled={isProcessing}
                          copy={{
                            currentPlan: CONTENT.crossSell.currentPlan,
                            changePlan: CONTENT.crossSell.changePlan,
                            upgradeTagline: CONTENT.crossSell.upgradeTagline,
                            upgradeHelp: CONTENT.crossSell.upgradeHelp,
                            upgradeCatalogHint: CONTENT.crossSell.upgradeCatalogHint,
                            upgradeDiffMoreSuffix: CONTENT.crossSell.upgradeDiffMoreSuffix,
                            upgradeDiffLessSuffix: CONTENT.crossSell.upgradeDiffLessSuffix,
                            upgradeDiffSame: CONTENT.crossSell.upgradeDiffSame,
                            selectPlan: CONTENT.crossSell.selectPlan,
                            revertPlan: CONTENT.crossSell.revertPlan,
                            addonTitle: CONTENT.crossSell.addonTitle,
                            addonUnavailable: CONTENT.crossSell.addonUnavailable,
                            viewDetails: CONTENT.crossSell.viewDetails,
                          }}
                        />
                      ) : undefined
                    }
                  />

                  {/* Resultado de erro */}
                  {result && !result.success && (
                    <Card className="border-destructive/20 bg-destructive/10 mt-6">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                          <div>
                            <div className="font-medium text-destructive">
                              {CONTENT.errorPayment.title}
                            </div>
                            <div className="text-sm mt-1 text-destructive/80">{result.message}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </main>

      <PublicFooter footnote={CONTENT.footer.supportHint} />
    </div>
  )
}
