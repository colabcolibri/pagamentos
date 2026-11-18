'use client'

import { use, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'

import { CheckoutScreen } from '@/components/checkout/checkout-screen'
import { isPriceSoldOut } from '@/components/checkout/product-price-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fetchProductWithPriceById } from '@/hooks/use-product-price'
import type { Price, Product } from '@/lib/payments/product'

export default function ProductOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>
  searchParams: Promise<{ price?: string }>
}) {
  const { ref } = use(params)
  const { price: requestedPriceId } = use(searchParams)
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery<{ product: Product }>({
    queryKey: ['public-product-by-ref', ref],
    queryFn: async () => {
      const response = await fetch(`/api/products/${encodeURIComponent(ref)}`)
      if (!response.ok) {
        throw new Error('Produto não encontrado')
      }
      return (await response.json()) as { product: Product }
    },
    enabled: Boolean(ref),
  })

  const activePrices = useMemo((): Price[] => {
    const prices = data?.product?.prices ?? []
    return prices.filter((p) => p.active !== false)
  }, [data?.product?.prices])

  const effectivePriceId = useMemo(() => {
    if (selectedPriceId && activePrices.some((p) => p.id === selectedPriceId)) {
      return selectedPriceId
    }
    if (requestedPriceId && activePrices.some((p) => p.id === requestedPriceId)) {
      return requestedPriceId
    }
    return activePrices.find((p) => !isPriceSoldOut(p))?.id ?? activePrices[0]?.id ?? null
  }, [activePrices, requestedPriceId, selectedPriceId])

  useEffect(() => {
    for (const p of activePrices) {
      if (p.id === effectivePriceId) continue
      void queryClient.prefetchQuery({
        queryKey: ['product-by-price', p.id],
        queryFn: () => fetchProductWithPriceById(p.id),
        staleTime: 5 * 60 * 1000,
      })
    }
  }, [activePrices, effectivePriceId, queryClient])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" aria-hidden />
          <p className="text-muted-foreground">Carregando oferta...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.product || !effectivePriceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-foreground mb-2">
              Oferta indisponível
            </h2>
            <p className="text-muted-foreground mb-4">
              {error
                ? 'Não foi possível carregar este produto.'
                : 'Este produto não possui opções de pagamento ativas.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => void refetch()} variant="outline">
                Tentar novamente
              </Button>
              <Link href="/">
                <Button>Voltar</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <CheckoutScreen
      priceId={effectivePriceId}
      productPrices={activePrices}
      onSelectPrice={setSelectedPriceId}
    />
  )
}
