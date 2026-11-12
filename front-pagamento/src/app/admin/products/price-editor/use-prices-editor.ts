'use client'

import { useState } from 'react'

import type { PriceEmailAddon } from '@quitou/core/email'

import type { PriceTopicSection } from '@/components/price-topics/types'
import { copyToClipboard } from '@/lib/clipboard'

import { effectiveListAvista, effectiveListParcelado } from './checkout-promo'
import {
  formatCentsAsEditableMoney,
  formatMoney,
  formatPercentForInputDisplay,
  formatPriceDescription,
  parseMoneyInputToCents,
  parsePercentInput,
  sanitizePercentDraftInput,
} from './formatters'
import { normalizePriceAccessMetadata } from './normalize'
import type { Price, PriceMetadata, PricePromoTierDraft, PricesEditorProps } from './types'

type IntMetaDraftKind = 'cash_discount' | 'max_installments'

function intMetaDraftKey(kind: IntMetaDraftKind, index: number) {
  return `${kind}:${index}`
}

export function usePricesEditor({ prices, onChange, productRef }: PricesEditorProps) {
  const [openPrices, setOpenPrices] = useState<Record<number, boolean>>({})
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [amountDraftByIndex, setAmountDraftByIndex] = useState<Record<number, string>>({})
  const [intMetaDraftByKey, setIntMetaDraftByKey] = useState<Record<string, string>>({})

  const addPrice = () => {
    const newPrice: Price = {
      id: `temp-${Date.now()}`,
      ref: `${productRef}-${prices.length + 1}`,
      amount: 0,
      currency: 'BRL',
      recurring: false,
      interval: null,
      interval_count: 1,
      active: true,
      metadata: { title: '', cash_discount: 0, max_installments: 12, lifetime_access: true },
      email_addon: null,
      stock_cap: null,
      stock_sold: 0,
      promo_tiers: [],
      upgrade_to_price_ids: [],
      addon_price_ids: [],
    }
    onChange([...prices, newPrice])
    setOpenPrices((prev) => ({ ...prev, [prices.length]: true }))
  }

  const updatePrice = (index: number, updates: Partial<Price>) => {
    const newPrices = [...prices]
    let next = { ...newPrices[index], ...updates }
    if (next.metadata) {
      next = {
        ...next,
        metadata: normalizePriceAccessMetadata(next.metadata as PriceMetadata),
      }
    }
    newPrices[index] = next
    onChange(newPrices)
  }

  const getMetadata = (price: Price): PriceMetadata => price.metadata ?? {}

  const removePrice = (index: number) => {
    onChange(prices.filter((_, i) => i !== index))
  }

  const movePrice = (index: number, direction: 'up' | 'down') => {
    const newPrices = [...prices]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newPrices.length) return
    ;[newPrices[index], newPrices[targetIndex]] = [newPrices[targetIndex], newPrices[index]]
    onChange(newPrices)
  }

  const copyCheckoutLink = async (priceId: string, index: number) => {
    const baseUrl = window.location.origin
    const checkoutUrl = `${baseUrl}/checkout/${priceId}`
    const success = await copyToClipboard(checkoutUrl, {
      successMessage: 'Link de checkout copiado!',
      showToast: false,
    })
    if (success) {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const getAmountInputValue = (index: number): string => {
    if (amountDraftByIndex[index] !== undefined) return amountDraftByIndex[index]
    const cents = prices[index]?.amount ?? 0
    return formatCentsAsEditableMoney(cents)
  }

  const onAmountInputFocus = (index: number) => {
    const cents = prices[index]?.amount ?? 0
    setAmountDraftByIndex((d) => ({
      ...d,
      [index]: formatCentsAsEditableMoney(cents),
    }))
  }

  const onAmountInputChange = (index: number, value: string) => {
    setAmountDraftByIndex((d) => ({ ...d, [index]: value }))
  }

  const onAmountInputBlur = (index: number) => {
    const raw = amountDraftByIndex[index]
    setAmountDraftByIndex((d) => {
      const next = { ...d }
      delete next[index]
      return next
    })
    updatePrice(index, { amount: parseMoneyInputToCents(raw ?? '') })
  }

  const getIntMetaInputValue = (
    kind: IntMetaDraftKind,
    index: number,
    fallback: number
  ): string => {
    const k = intMetaDraftKey(kind, index)
    if (intMetaDraftByKey[k] !== undefined) return intMetaDraftByKey[k]
    if (kind === 'cash_discount') return formatPercentForInputDisplay(fallback)
    return String(fallback)
  }

  const onIntMetaInputFocus = (kind: IntMetaDraftKind, index: number, value: number) => {
    setIntMetaDraftByKey((d) => ({
      ...d,
      [intMetaDraftKey(kind, index)]:
        kind === 'cash_discount' ? formatPercentForInputDisplay(value) : String(value),
    }))
  }

  const onIntMetaInputChange = (kind: IntMetaDraftKind, index: number, value: string) => {
    const nextText =
      kind === 'cash_discount' ? sanitizePercentDraftInput(value) : value.replace(/\D/g, '')
    setIntMetaDraftByKey((d) => ({
      ...d,
      [intMetaDraftKey(kind, index)]: nextText,
    }))
  }

  const onIntMetaInputBlur = (
    kind: IntMetaDraftKind,
    index: number,
    opts: { min: number; max: number; field: keyof PriceMetadata }
  ) => {
    const k = intMetaDraftKey(kind, index)
    const raw = intMetaDraftByKey[k]
    setIntMetaDraftByKey((d) => {
      const next = { ...d }
      delete next[k]
      return next
    })
    const meta = getMetadata(prices[index])

    if (kind === 'cash_discount') {
      const parsed = parsePercentInput(raw === undefined || raw === null ? '' : String(raw).trim())
      const vRaw = parsed == null ? opts.min : Math.max(opts.min, Math.min(opts.max, parsed))
      const v = Math.round(vRaw * 100) / 100
      updatePrice(index, { metadata: { ...meta, [opts.field]: v } })
      return
    }

    const parsed = parseInt(raw === undefined || raw === '' ? String(opts.min) : raw, 10)
    const v = Number.isFinite(parsed) ? Math.max(opts.min, Math.min(opts.max, parsed)) : opts.min
    updatePrice(index, { metadata: { ...meta, [opts.field]: v } })
  }

  const getEmailAddon = (price: Price): PriceEmailAddon => {
    const ea = price.email_addon
    if (ea && typeof ea === 'object' && !Array.isArray(ea)) {
      return ea as PriceEmailAddon
    }
    return {}
  }

  const setOrderCreatedEmailField = (
    index: number,
    field: 'custom_message' | 'instructions',
    value: string
  ) => {
    const prev = getEmailAddon(prices[index])
    updatePrice(index, {
      email_addon: {
        ...prev,
        order_created: { ...prev.order_created, [field]: value },
      },
    })
  }

  const setPaymentConfirmedEmailField = (index: number, field: 'custom_message', value: string) => {
    const prev = getEmailAddon(prices[index])
    updatePrice(index, {
      email_addon: {
        ...prev,
        payment_confirmed: { ...prev.payment_confirmed, [field]: value },
      },
    })
  }

  const getPaymentNextSteps = (price: Price): string[] => {
    const steps = getEmailAddon(price).payment_confirmed?.next_steps
    return Array.isArray(steps) ? [...steps] : []
  }

  const setPaymentNextSteps = (index: number, steps: string[]) => {
    const prev = getEmailAddon(prices[index])
    updatePrice(index, {
      email_addon: {
        ...prev,
        payment_confirmed: { ...prev.payment_confirmed, next_steps: steps },
      },
    })
  }

  const setMetadataField = (index: number, field: keyof PriceMetadata, value: number) => {
    const meta = getMetadata(prices[index])
    updatePrice(index, { metadata: { ...meta, [field]: value } })
  }

  const setMetadataStringField = (index: number, field: keyof PriceMetadata, value: string) => {
    const meta = getMetadata(prices[index])
    updatePrice(index, { metadata: { ...meta, [field]: value.trim() || undefined } })
  }

  const getTopics = (price: Price): PriceTopicSection[] =>
    Array.isArray((price.metadata as PriceMetadata)?.topics)
      ? (price.metadata as PriceMetadata).topics!
      : []

  const setTopics = (index: number, sections: PriceTopicSection[]) => {
    const meta = getMetadata(prices[index])
    updatePrice(index, { metadata: { ...meta, topics: sections } })
  }

  const addTopicSection = (index: number) => {
    setTopics(index, [...getTopics(prices[index]), { title: '', content: [] }])
  }

  const updateTopicSection = (
    priceIndex: number,
    sectionIndex: number,
    updates: Partial<PriceTopicSection>
  ) => {
    const sections = [...getTopics(prices[priceIndex])]
    sections[sectionIndex] = { ...sections[sectionIndex], ...updates }
    setTopics(priceIndex, sections)
  }

  const removeTopicSection = (priceIndex: number, sectionIndex: number) => {
    setTopics(
      priceIndex,
      getTopics(prices[priceIndex]).filter((_, i) => i !== sectionIndex)
    )
  }

  const addPromoTier = (index: number) => {
    const p = prices[index]
    const tiers = [...(p.promo_tiers ?? [])]
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `temp-tier-${Date.now()}`
    tiers.push({
      id,
      sort_order: tiers.length,
      discount_percent: 10,
      ends_at: null,
      max_units: null,
      units_sold: 0,
      applies_to: 'both',
    })
    updatePrice(index, { promo_tiers: tiers })
  }

  const updatePromoTier = (
    priceIndex: number,
    tierIndex: number,
    updates: Partial<PricePromoTierDraft>
  ) => {
    const p = prices[priceIndex]
    const tiers = [...(p.promo_tiers ?? [])]
    tiers[tierIndex] = { ...tiers[tierIndex], ...updates }
    updatePrice(priceIndex, { promo_tiers: tiers })
  }

  const removePromoTier = (priceIndex: number, tierIndex: number) => {
    const p = prices[priceIndex]
    updatePrice(priceIndex, {
      promo_tiers: (p.promo_tiers ?? []).filter((_, i) => i !== tierIndex),
    })
  }

  return {
    prices,
    openPrices,
    setOpenPrices,
    copiedIndex,
    addPrice,
    updatePrice,
    removePrice,
    movePrice,
    copyCheckoutLink,
    getAmountInputValue,
    onAmountInputFocus,
    onAmountInputChange,
    onAmountInputBlur,
    getIntMetaInputValue,
    onIntMetaInputFocus,
    onIntMetaInputChange,
    onIntMetaInputBlur,
    getMetadata,
    getEmailAddon,
    setOrderCreatedEmailField,
    setPaymentConfirmedEmailField,
    getPaymentNextSteps,
    setPaymentNextSteps,
    setMetadataField,
    setMetadataStringField,
    getTopics,
    addTopicSection,
    updateTopicSection,
    removeTopicSection,
    addPromoTier,
    updatePromoTier,
    removePromoTier,
    formatMoney,
    formatPriceDescription,
    effectiveListAvista,
    effectiveListParcelado,
  }
}

export type UsePricesEditorReturn = ReturnType<typeof usePricesEditor>
