'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'

type GatewayAvailability = {
  asaas: boolean
  pagarme: boolean
}

export function ProcessedBy() {
  const [gateways, setGateways] = useState<GatewayAvailability | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/payments/gateways')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: GatewayAvailability | null) => {
        if (!active || !data) return
        setGateways({ asaas: Boolean(data.asaas), pagarme: Boolean(data.pagarme) })
      })
      .catch(() => {
        if (active) setGateways({ asaas: false, pagarme: false })
      })
    return () => {
      active = false
    }
  }, [])

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
