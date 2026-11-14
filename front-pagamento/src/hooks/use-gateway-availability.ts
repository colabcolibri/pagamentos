'use client'

import { useQuery } from '@tanstack/react-query'

export interface GatewayAvailability {
  asaas: boolean
  pagarme: boolean
}

const FALLBACK_AVAILABILITY: GatewayAvailability = {
  asaas: false,
  pagarme: false,
}

async function fetchGatewayAvailability(): Promise<GatewayAvailability> {
  try {
    const response = await fetch('/api/payments/gateways')
    if (!response.ok) return FALLBACK_AVAILABILITY
    const data = (await response.json()) as Partial<GatewayAvailability>
    return {
      asaas: Boolean(data.asaas),
      pagarme: Boolean(data.pagarme),
    }
  } catch {
    return FALLBACK_AVAILABILITY
  }
}

export function useGatewayAvailability() {
  return useQuery({
    queryKey: ['payments', 'gateways'],
    queryFn: fetchGatewayAvailability,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
