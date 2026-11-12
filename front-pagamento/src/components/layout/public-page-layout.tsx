'use client'

import { cn } from '@/lib/utils'

import { PageContainer } from './page-container'
import type { PublicFooterProps } from './public-footer'
import { PublicFooter } from './public-footer'
import type { PublicHeaderProps } from './public-header'
import { PublicHeader } from './public-header'

interface PublicPageLayoutProps {
  children: React.ReactNode
  headerProps?: PublicHeaderProps
  footerProps?: PublicFooterProps
  containerProps?: {
    maxWidth?: 'default' | 'narrow' | 'wide' | 'full'
    className?: string
  }
  className?: string
  showHeader?: boolean
  showFooter?: boolean
}

export function PublicPageLayout({
  children,
  headerProps,
  footerProps,
  containerProps,
  className,
  showHeader = true,
  showFooter = true,
}: PublicPageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background flex flex-col', className)}>
      {showHeader && <PublicHeader {...headerProps} />}

      <main className="flex-1">
        <PageContainer {...containerProps}>{children}</PageContainer>
      </main>

      {showFooter && <PublicFooter {...footerProps} />}
    </div>
  )
}
