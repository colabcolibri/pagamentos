/**
 * Tipos e builder puro de steps de preço para o checkout.
 * Responsabilidade única: calcular a cascata de preços a exibir para um fluxo.
 */
import type { PricePromoCheckoutFlow, PricePromoPublicDisplay } from '@quitou/core/pricing'

import type { CheckoutPromoSummaryLabels } from './checkout-promo-labels'

export type PromoPriceStep = {
  id: string
  caption: string
  cents: number
  variant: 'struck' | 'mid' | 'final'
  badge?: string
}

export type CheckoutPromoCouponFlowBreakdown = {
  subtotalCents: number
  discountCents: number
  finalCents: number
}

export type CheckoutPromoCouponOverlay = {
  appliesTo: 'avista' | 'parcelado' | 'both'
  avista?: CheckoutPromoCouponFlowBreakdown
  parcelado?: CheckoutPromoCouponFlowBreakdown
  /** Código normalizado do cupom (ex.: "PROMO10"). */
  code?: string
  /** Percentual de desconto do cupom (null quando desconto é valor fixo). */
  discountPercent?: number | null
}

export function formatMoneyCents(cents: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/**
 * Monta a cascata de steps de preço para o fluxo selecionado.
 * Ordem: preço cheio riscado → passo intermediário (se aplicável) → base riscada → final com cupom.
 */
export function buildFlowPriceSteps(
  flow: PricePromoCheckoutFlow,
  display: PricePromoPublicDisplay,
  couponOverlay: CheckoutPromoCouponOverlay | null,
  labels: CheckoutPromoSummaryLabels,
  currency: string
): PromoPriceStep[] {
  const steps: PromoPriceStep[] = []
  const catalog = display.catalogListCents
  const flowData = display[flow]
  const basePrice = flowData.promoListCents
  const coupon = flow === 'avista' ? couponOverlay?.avista : couponOverlay?.parcelado
  const hasCoupon = coupon != null && coupon.discountCents > 0

  if (flow === 'avista') {
    const cashPct = flowData.cashDiscountPercent ?? 0
    const afterTier = flowData.afterPromoTierCents ?? basePrice
    const hasPromoTier = flowData.discountPercent > 0 && afterTier < catalog
    const hasCash = cashPct > 0 && basePrice < afterTier
    const hasAnyBaseDiscount = hasPromoTier || hasCash

    if (hasAnyBaseDiscount || hasCoupon) {
      steps.push({
        id: 'cheio',
        caption: labels.priceStepFull,
        cents: catalog,
        variant: 'struck',
      })
    }

    // Passo intermediário: após faixa e antes do desconto à vista
    if (hasPromoTier && hasCash) {
      steps.push({
        id: 'after-tier',
        caption: labels.priceStepPromo,
        cents: afterTier,
        variant: 'struck',
        badge: `−${flowData.discountPercent}% ${labels.badgePromo}`,
      })
    }

    const avistaFinalBadge =
      hasPromoTier && hasCash
        ? `−${cashPct}% ${labels.badgeAvista}`
        : hasPromoTier
          ? `−${flowData.discountPercent}% ${labels.badgePromo}`
          : hasCash
            ? `−${cashPct}% ${labels.badgeAvista}`
            : undefined

    steps.push({
      id: 'avista-base',
      caption: hasAnyBaseDiscount ? labels.priceStepPromo : labels.priceStepAvistaAllInOne,
      cents: basePrice,
      variant: hasCoupon ? 'struck' : 'final',
      badge: avistaFinalBadge,
    })
  } else {
    const hasPromo = flowData.discountPercent > 0 && basePrice < catalog

    if (hasPromo || hasCoupon) {
      steps.push({
        id: 'cheio',
        caption: labels.priceStepFull,
        cents: catalog,
        variant: 'struck',
      })
    }

    steps.push({
      id: 'parc-base',
      caption: labels.priceStepParceladoTotal,
      cents: basePrice,
      variant: hasCoupon ? 'struck' : 'final',
      badge: hasPromo ? `−${flowData.discountPercent}% ${labels.badgePromo}` : undefined,
    })
  }

  if (hasCoupon && coupon) {
    steps.push({
      id: `${flow}-coupon`,
      caption: flow === 'avista' ? labels.priceStepPromo : labels.priceStepParceladoTotal,
      cents: coupon.finalCents,
      variant: 'final',
      badge: `−${formatMoneyCents(coupon.discountCents, currency)}`,
    })
  }

  return steps
}

/**
 * Linha da tabela de preços estilo mini-contabilidade.
 * `cents` é sempre positivo; `role` determina se é base, desconto ou total.
 */
export type PriceTableRow = {
  id: string
  label: string
  cents: number
  role: 'base' | 'discount' | 'subtotal' | 'total'
  /** Desenha divisor acima da linha. */
  dividerAbove?: boolean
}

export type CheckoutAddonTableLine = {
  /** Nome do opcional (ex.: do `getAddonOfferDisplay`). */
  label: string
  cents: number
}

export type BuildFlowPriceTableOptions = {
  /**
   * Soma em centavos dos opcionais (lista = `amount`). No à vista sem cupom, o % PIX/1x do plano
   * incide sobre (valor do plano após faixa) + opcionais — mesmo critério do checkout Asaas.
   * Ignorado se `addonLineItems` tiver itens (a soma vem das linhas).
   */
  addonListCents?: number
  /** Uma linha por opcional na tabela: rótulo vira "Opcionais · {label}". */
  addonLineItems?: CheckoutAddonTableLine[]
}

/**
 * Monta as linhas da tabela de preços para o fluxo selecionado.
 * Promo por tempo: só no plano. Opcionais entram na lista cheia; depois “plano na lista + opcionais”
 * antes de PIX/1x, cupom, etc.
 */
export function buildFlowPriceTable(
  flow: PricePromoCheckoutFlow,
  display: PricePromoPublicDisplay,
  couponOverlay: CheckoutPromoCouponOverlay | null,
  labels: CheckoutPromoSummaryLabels,
  _currency: string,
  options?: BuildFlowPriceTableOptions
): PriceTableRow[] {
  const addonLineItemsNorm =
    options?.addonLineItems
      ?.map((l) => ({
        label: (l.label ?? '').trim(),
        cents: Math.max(0, Math.round(l.cents)),
      }))
      .filter((l) => l.cents > 0 && l.label.length > 0) ?? []
  const addonListCentsFromItems = addonLineItemsNorm.reduce((s, l) => s + l.cents, 0)
  const addonListCents =
    addonLineItemsNorm.length > 0
      ? addonListCentsFromItems
      : Math.max(0, Math.round(options?.addonListCents ?? 0))
  const hasAddons = addonListCents > 0
  const catalog = display.catalogListCents
  const flowData = display[flow]
  const basePrice = flowData.promoListCents
  const coupon = flow === 'avista' ? couponOverlay?.avista : couponOverlay?.parcelado
  const hasCoupon = coupon != null && coupon.discountCents > 0

  const couponCode = couponOverlay?.code ?? null
  const couponPct = couponOverlay?.discountPercent ?? null
  function couponLabel(): string {
    const inside: string[] = []
    if (couponPct != null) inside.push(`−${Math.round(couponPct)}%`)
    const parenthetical = inside.length > 0 ? ` (${inside.join(', ')})` : ''
    return couponCode
      ? `${labels.discountCouponLabel} ${couponCode}${parenthetical}`
      : `${labels.discountCouponLabel}${parenthetical}`
  }

  const rows: PriceTableRow[] = []

  /** Só plano catálogo + opcionais (sem linha de subtotal lista). Para fluxo sem descontos. */
  function pushBaseAndAddonsNoListaFooter(target: PriceTableRow[], mainCatalogCents: number): void {
    target.push({
      id: 'base',
      label: labels.sidebarFullPrice,
      cents: mainCatalogCents,
      role: 'base',
    })
    if (!hasAddons) return
    if (addonLineItemsNorm.length > 0) {
      addonLineItemsNorm.forEach((line, i) => {
        target.push({
          id: `addon-item-${i}`,
          label: `${labels.addonExtrasLine} · ${line.label}`,
          cents: line.cents,
          role: 'subtotal',
        })
      })
    } else {
      target.push({
        id: 'addons-line',
        label: labels.addonExtrasLine,
        cents: addonListCents,
        role: 'subtotal',
      })
    }
  }

  /**
   * Plano (catálogo) → desconto promo só no plano → opcionais em lista cheia → subtotal na lista.
   */
  function pushPlanoPromoOpcionaisListaSubtotal(
    target: PriceTableRow[],
    mainCatalogCents: number,
    afterTierMainCents: number,
    hasPromoTier: boolean,
    tierDiscountPercent: number
  ): void {
    target.push({
      id: 'base',
      label: labels.sidebarFullPrice,
      cents: mainCatalogCents,
      role: 'base',
    })
    if (hasPromoTier) {
      target.push({
        id: 'tier-discount',
        label: `${labels.discountPromoLabel} (−${tierDiscountPercent}%)`,
        cents: mainCatalogCents - afterTierMainCents,
        role: 'discount',
        dividerAbove: true,
      })
    }
    const listaPlanoCents = hasPromoTier ? afterTierMainCents : mainCatalogCents

    if (!hasAddons) return

    if (addonLineItemsNorm.length > 0) {
      addonLineItemsNorm.forEach((line, i) => {
        target.push({
          id: `addon-item-${i}`,
          label: `${labels.addonExtrasLine} · ${line.label}`,
          cents: line.cents,
          role: 'subtotal',
        })
      })
    } else {
      target.push({
        id: 'addons-line',
        label: labels.addonExtrasLine,
        cents: addonListCents,
        role: 'subtotal',
      })
    }
    target.push({
      id: 'lista-subtotal-plano-opcionais',
      label: labels.checkoutGrossWithAddonsLine,
      cents: listaPlanoCents + addonListCents,
      role: 'subtotal',
      dividerAbove: true,
    })
  }

  if (flow === 'avista') {
    const cashPct = flowData.cashDiscountPercent ?? 0
    const afterTier = flowData.afterPromoTierCents ?? basePrice
    const hasPromoTier = flowData.discountPercent > 0 && afterTier < catalog
    const hasCashNoCoupon = !hasCoupon && cashPct > 0 && basePrice < afterTier
    const hasCashWithCoupon = hasCoupon && cashPct > 0
    const hasAnyDiscount = hasPromoTier || hasCashNoCoupon || hasCoupon

    if (!hasAnyDiscount) {
      if (!hasAddons) {
        return [
          {
            id: 'total-solo',
            label: labels.priceStepAvistaAllInOne,
            cents: basePrice,
            role: 'total',
          },
        ]
      }
      const avFlat: PriceTableRow[] = []
      pushBaseAndAddonsNoListaFooter(avFlat, catalog)
      avFlat.push({
        id: 'total-avista',
        label: labels.priceTableTotalRow,
        cents: catalog + addonListCents,
        role: 'total',
        dividerAbove: true,
      })
      return avFlat
    }

    if (!hasCoupon) {
      pushPlanoPromoOpcionaisListaSubtotal(
        rows,
        catalog,
        afterTier,
        hasPromoTier,
        flowData.discountPercent
      )
      const mergedBeforeCash = afterTier + addonListCents
      const cashOffTotal =
        hasCashNoCoupon && cashPct > 0 ? Math.round((mergedBeforeCash * cashPct) / 100) : 0
      if (hasCashNoCoupon && cashOffTotal > 0) {
        rows.push({
          id: 'cash-discount',
          label: `${labels.discountAvistaLabel} (−${cashPct}%)`,
          cents: cashOffTotal,
          role: 'discount',
          dividerAbove: true,
        })
      }
      const totalAvista =
        hasCashNoCoupon && cashOffTotal > 0
          ? Math.max(1, mergedBeforeCash - cashOffTotal)
          : mergedBeforeCash
      rows.push({
        id: 'total-avista',
        label: labels.priceTableTotalRow,
        cents: totalAvista,
        role: 'total',
        dividerAbove: true,
      })
    } else if (coupon) {
      pushPlanoPromoOpcionaisListaSubtotal(
        rows,
        catalog,
        afterTier,
        hasPromoTier,
        flowData.discountPercent
      )
      rows.push({
        id: 'coupon-discount',
        label: couponLabel(),
        cents: coupon.discountCents,
        role: 'discount',
        dividerAbove: true,
      })
      if (hasCashWithCoupon) {
        const sub = coupon.subtotalCents
        const fin = coupon.finalCents
        const cashAmount = Number.isFinite(sub) && Number.isFinite(fin) && sub > fin ? sub - fin : 0
        if (cashAmount > 0) {
          rows.push({
            id: 'subtotal-before-cash',
            label: labels.couponSubtotalCaption,
            cents: sub,
            role: 'subtotal',
          })
          rows.push({
            id: 'cash-discount',
            label: `${labels.discountAvistaLabel} (−${cashPct}%)`,
            cents: cashAmount,
            role: 'discount',
          })
        }
      }
      rows.push({
        id: 'total-final',
        label: labels.priceTableTotalRow,
        cents: coupon.finalCents,
        role: 'total',
        dividerAbove: true,
      })
    }
  } else {
    const hasPromo = flowData.discountPercent > 0 && basePrice < catalog

    if (!hasPromo && !hasCoupon) {
      if (!hasAddons) {
        return [
          {
            id: 'total-solo',
            label: labels.priceStepParceladoTotal,
            cents: basePrice,
            role: 'total',
          },
        ]
      }
      const parcFlat: PriceTableRow[] = []
      pushBaseAndAddonsNoListaFooter(parcFlat, catalog)
      parcFlat.push({
        id: 'total-parc',
        label: labels.priceTableTotalRow,
        cents: catalog + addonListCents,
        role: 'total',
        dividerAbove: true,
      })
      return parcFlat
    }

    const afterTierParc = hasPromo ? basePrice : catalog
    pushPlanoPromoOpcionaisListaSubtotal(
      rows,
      catalog,
      afterTierParc,
      hasPromo,
      flowData.discountPercent
    )

    if (!hasCoupon) {
      rows.push({
        id: 'total-parc',
        label: labels.priceStepParceladoTotal,
        cents: basePrice + addonListCents,
        role: 'total',
        dividerAbove: true,
      })
    } else if (coupon) {
      rows.push({
        id: 'coupon-discount',
        label: couponLabel(),
        cents: coupon.discountCents,
        role: 'discount',
        dividerAbove: true,
      })
      rows.push({
        id: 'total-final',
        label: labels.priceTableTotalRow,
        cents: coupon.finalCents,
        role: 'total',
        dividerAbove: true,
      })
    }
  }

  return rows
}

/** Badges de desconto para o bloco sidebar (coluna do produto). */
export function sidebarAvistaDiscountBadges(
  display: PricePromoPublicDisplay,
  labels: CheckoutPromoSummaryLabels
): string[] {
  const a = display.avista
  const catalog = display.catalogListCents
  const afterTier = a.afterPromoTierCents ?? a.promoListCents
  const final = a.promoListCents
  const cashPct = a.cashDiscountPercent ?? 0
  const badges: string[] = []
  if (afterTier < catalog && a.discountPercent > 0) {
    badges.push(`−${a.discountPercent}% ${labels.badgePromo}`)
  }
  if (cashPct > 0 && final < afterTier) {
    badges.push(`−${cashPct}% ${labels.badgeAvista}`)
  }
  return badges
}

export function sidebarParceladoDiscountBadges(
  display: PricePromoPublicDisplay,
  labels: CheckoutPromoSummaryLabels
): string[] {
  const p = display.parcelado
  const catalog = display.catalogListCents
  if (p.promoListCents < catalog && p.discountPercent > 0) {
    return [`−${p.discountPercent}% ${labels.badgePromo}`]
  }
  return []
}
