'use client'

import { use } from 'react'

import { CheckoutScreen } from '@/components/checkout/checkout-screen'

export default function CheckoutPage({ params }: { params: Promise<{ priceId: string }> }) {
  const { priceId } = use(params)
  return <CheckoutScreen priceId={priceId} />
}
