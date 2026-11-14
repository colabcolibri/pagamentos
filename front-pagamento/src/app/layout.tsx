import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { UmamiScript } from '@/components/analytics/umami-script'
import { BrandProvider } from '@/components/brand/brand-provider'
import { FaleConoscoFab } from '@/components/fale-conosco/fale-conosco-fab'
import { Toast } from '@/components/layout/ui/toast'
import { QueryProvider } from '@/components/providers/query-provider'
import { loadRuntimeBrandConfig } from '@/lib/platform/instance-config'

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

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadRuntimeBrandConfig()
  return {
    title: brand.name,
    description: brand.tagline,
    icons: {
      icon: brand.logoSrc ?? '/icon.svg',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const brand = await loadRuntimeBrandConfig()
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UmamiScript />
        <BrandProvider brand={brand}>
          <QueryProvider>
            {children}
            <Toast />
            <FaleConoscoFab />
          </QueryProvider>
        </BrandProvider>
      </body>
    </html>
  )
}
