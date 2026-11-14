'use client'

import Image from 'next/image'

import { useGatewayAvailability } from '@/hooks/use-gateway-availability'

export function ProcessedBy() {
  const { data: gateways } = useGatewayAvailability()

  if (!gateways || (!gateways.asaas && !gateways.pagarme)) return null

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
        Transações processadas por
      </span>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {gateways.asaas ? (
          <Image
            src="/logos/asaas.svg"
            alt="Asaas"
            width={72}
            height={22}
            className="h-[18px] w-auto opacity-30 grayscale"
          />
        ) : null}
        {gateways.pagarme ? (
          <span className="text-sm font-semibold tracking-tight text-muted-foreground/50">
            Pagar.me
          </span>
        ) : null}
      </div>
    </div>
  )
}
