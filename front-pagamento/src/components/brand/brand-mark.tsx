'use client'

import Image from 'next/image'

import { useBrand } from '@/components/brand/brand-provider'
import { cn } from '@/lib/utils'

export function BrandMark({
  className,
  imageClassName = 'h-6 w-auto max-w-full',
  priority = false,
}: {
  className?: string
  imageClassName?: string
  priority?: boolean
}) {
  const brand = useBrand()

  if (!brand.logoSrc) {
    return (
      <span className={cn('text-sm font-semibold wrap-break-word text-foreground', className)}>
        {brand.name}
      </span>
    )
  }

  return (
    <Image
      src={brand.logoSrc}
      alt={brand.name}
      width={140}
      height={36}
      priority={priority}
      className={cn('mx-auto block', imageClassName, className)}
    />
  )
}
