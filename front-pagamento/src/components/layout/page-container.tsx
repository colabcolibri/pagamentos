'use client'

import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  maxWidth?: 'default' | 'narrow' | 'wide' | 'full'
  className?: string
}

const maxWidthClasses = {
  default: 'max-w-screen-xl',
  narrow: 'max-w-screen-lg',
  wide: 'max-w-screen-2xl',
  full: 'max-w-full',
}

export function PageContainer({ children, maxWidth = 'default', className }: PageContainerProps) {
  return (
    <div
      className={cn('container mx-auto px-4 md:px-6 lg:px-8', maxWidthClasses[maxWidth], className)}
    >
      {children}
    </div>
  )
}
