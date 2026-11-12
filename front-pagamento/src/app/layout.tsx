import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { UmamiScript } from '@/components/analytics/umami-script'
import { BrandProvider } from '@/components/brand/brand-provider'
import { FaleConoscoFab } from '@/components/fale-conosco/fale-conosco-fab'
import { Toast } from '@/components/layout/ui/toast'
import { QueryProvider } from '@/components/providers/query-provider'
import { loadBrandConfig } from '@/lib/brand/load-brand-config'

import './globals.css'

export const dynamic = 'force-dynamic'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export function generateMetadata(): Metadata {
  const brand = loadBrandConfig()
  return {
    title: brand.name,
    description: brand.tagline,
    icons: {
      icon: '/icon.svg',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const brand = loadBrandConfig()
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UmamiScript />
        <BrandProvider brand={brand}>
          <QueryProvider>{children}</QueryProvider>
          <Toast />
          <FaleConoscoFab />
        </BrandProvider>
      </body>
    </html>
  )
}
