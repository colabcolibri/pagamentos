import { type PricePromoPublicDisplay, resolveCheckoutPricePromo } from '@quitou/core/pricing'
import { useQuery } from '@tanstack/react-query'

import { loadCheckoutProductByPriceAction } from '@/app/actions/checkout-product-actions'
import type { Price, Product } from '@/lib/payments/product'

// ==========================================
// TIPOS ESPECÍFICOS DO HOOK
// ==========================================

/**
 * Produto com preços formatados para exibição
 * Estende o tipo Product do domínio com campos formatados
 */
export interface ProductWithPrice extends Product {
  prices: Price[]
  mainPrice?: Price
  formattedPrice?: string
  formattedCashTag?: string
  formattedInstallmentsTag?: string
  /** Só em rotas que retornam `price_ui` (ex.: by-price). */
  priceUi?: PricePromoPublicDisplay | null
}

// ==========================================
// UTILITÁRIOS DE FORMATAÇÃO
// ==========================================

function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

/** Exportado para testes e uso em formatação fora do hook */
export function calculateCashPrice(originalPrice: number, cashDiscount: number): number {
  return Math.round(originalPrice * (1 - cashDiscount / 100))
}

function calculateInstallmentPrice(originalPrice: number, installments: number): number {
  return Math.round(originalPrice / installments)
}

function checkoutRowFromPrice(mainPrice: Price) {
  return {
    amount: mainPrice.amount,
    stock_cap: mainPrice.stock_cap ?? null,
    stock_sold: mainPrice.stock_sold ?? 0,
    price_promo_tiers: mainPrice.promo_tiers?.map((t) => ({
      id: t.id,
      sort_order: t.sort_order,
      discount_percent: t.discount_percent,
      ends_at: t.ends_at,
      max_units: t.max_units,
      units_sold: t.units_sold,
      applies_to: t.applies_to,
    })),
  }
}

/** Exportado para testes e uso em formatação fora do hook */
export function formatProductPrice(product: ProductWithPrice): ProductWithPrice {
  const mainPrice = product.prices[0]

  if (!mainPrice) {
    return {
      ...product,
      mainPrice,
      formattedPrice: 'R$ 0,00',
      formattedCashTag: '',
      formattedInstallmentsTag: '',
    }
  }

  const row = checkoutRowFromPrice(mainPrice)
  const listAvista = resolveCheckoutPricePromo(row, 'avista').listCents
  const listParcelado = resolveCheckoutPricePromo(row, 'parcelado').listCents

  const metadata = (mainPrice.metadata as Record<string, unknown>) || {}
  const cashDiscountRaw = metadata.cash_discount
  const cashDiscount =
    typeof cashDiscountRaw === 'number'
      ? cashDiscountRaw
      : typeof cashDiscountRaw === 'string'
        ? parseFloat(cashDiscountRaw) || 0
        : 0
  const maxInstallmentsRaw = metadata.max_installments
  const parsedMax =
    typeof maxInstallmentsRaw === 'number'
      ? maxInstallmentsRaw
      : typeof maxInstallmentsRaw === 'string'
        ? parseInt(maxInstallmentsRaw, 10)
        : NaN
  const maxInstallments = !isNaN(parsedMax) && parsedMax >= 1 ? parsedMax : 1
  const currency = mainPrice.currency || 'BRL'

  // Preço à vista (com desconto) — base da promo aplicável ao fluxo à vista
  const cashPrice = calculateCashPrice(listAvista, cashDiscount)
  const formattedCashPrice = formatCurrency(cashPrice, currency)

  // Preço parcelado (sem desconto à vista) — base da promo aplicável ao parcelado
  const installmentPrice = calculateInstallmentPrice(listParcelado, maxInstallments)
  const formattedInstallmentPrice = formatCurrency(installmentPrice, currency)

  // Tags formatadas
  const formattedCashTag =
    cashDiscount > 0
      ? `${formattedCashPrice} à vista (${cashDiscount}% de desconto)`
      : `${formattedCashPrice} à vista`

  const formattedInstallmentsTag =
    maxInstallments > 1 ? `${maxInstallments}x de ${formattedInstallmentPrice}` : ''

  return {
    ...product,
    mainPrice,
    formattedPrice: formattedCashPrice,
    formattedCashTag,
    formattedInstallmentsTag,
  }
}

// ==========================================
// HOOK PRINCIPAL
// ==========================================

interface UseProductPriceOptions {
  enabled?: boolean
}

export function useProductPrice(productRef: string, options: UseProductPriceOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: ['product-price', productRef],
    queryFn: async () => {
      if (!productRef) {
        throw new Error('Product ref is required')
      }

      const response = await fetch(`/api/products/${productRef}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar produto')
      }

      const { product } = await response.json()

      // Filtrar apenas preços ativos
      const activePrices = (product.prices || []).filter((price: Price) => price.active)

      const productWithPrice: ProductWithPrice = {
        ...product,
        prices: activePrices,
      }

      return formatProductPrice(productWithPrice)
    },
    enabled: enabled && !!productRef,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// ==========================================
// HOOK PARA BUSCAR POR PRICE ID
// ==========================================

export function useProductByPriceId(priceId: string, options: UseProductPriceOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: ['product-by-price', priceId],
    queryFn: async () => {
      if (!priceId) {
        throw new Error('Price ID is required')
      }

      const payload = await loadCheckoutProductByPriceAction(priceId)
      if (!payload.ok) {
        throw new Error(payload.error || 'Erro ao buscar produto')
      }
      const { product, price_ui: priceUi } = payload

      // Filtrar apenas preços ativos e ordenar para colocar o selecionado primeiro
      const activePrices = (product.prices || [])
        .filter((price: Price) => price.active)
        .sort((a: Price, b: Price) => {
          if (a.id === priceId) return -1
          if (b.id === priceId) return 1
          return 0
        })

      const productWithPrice = {
        ...product,
        prices: activePrices,
      } as ProductWithPrice

      return {
        ...formatProductPrice(productWithPrice),
        priceUi: (priceUi ?? null) as PricePromoPublicDisplay | null,
      }
    },
    enabled: enabled && !!priceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ==========================================
// HOOK PARA MÚLTIPLOS PRODUTOS
// ==========================================

export function useProductsPrices(productRefs: string[], options: UseProductPriceOptions = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: ['products-prices', productRefs],
    queryFn: async () => {
      if (!productRefs || productRefs.length === 0) {
        throw new Error('Product refs are required')
      }

      const refsParam = productRefs.join(',')
      const response = await fetch(`/api/products/batch?refs=${encodeURIComponent(refsParam)}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar produtos')
      }

      const { products } = await response.json()

      if (!products || products.length === 0) {
        return []
      }

      // Processar cada produto
      const productsWithPrices: ProductWithPrice[] = products.map((product: Product) => {
        const activePrices = (product.prices || []).filter((price: Price) => price.active)

        const productWithPrice: ProductWithPrice = {
          ...product,
          prices: activePrices,
        }

        return formatProductPrice(productWithPrice)
      })

      return productsWithPrices
    },
    enabled: enabled && productRefs.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
