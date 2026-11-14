'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import type { BrandConfig } from '@/lib/brand/brand-config'

const BrandContext = createContext<BrandConfig | null>(null)
const BrandUpdateContext = createContext<((patch: Partial<BrandConfig>) => void) | null>(null)

export function BrandProvider({
  brand,
  children,
}: {
  brand: BrandConfig
  children: React.ReactNode
}) {
  const [current, setCurrent] = useState<BrandConfig>(brand)

  useEffect(() => {
    setCurrent(brand)
  }, [brand])

  const updateBrand = (patch: Partial<BrandConfig>) => {
    setCurrent((prev) => ({ ...prev, ...patch }))
  }

  return (
    <BrandContext.Provider value={current}>
      <BrandUpdateContext.Provider value={updateBrand}>{children}</BrandUpdateContext.Provider>
    </BrandContext.Provider>
  )
}

export function useBrand(): BrandConfig {
  const brand = useContext(BrandContext)
  if (!brand) {
    throw new Error('BrandProvider ausente')
  }
  return brand
}

export function useBrandUpdate(): (patch: Partial<BrandConfig>) => void {
  const update = useContext(BrandUpdateContext)
  return update ?? (() => {})
}
