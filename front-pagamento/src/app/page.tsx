'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { BrandMark } from '@/components/brand/brand-mark'
import { useBrand } from '@/components/brand/brand-provider'
import { ProcessedBy } from '@/components/home/processed-by'
import { PublicPageLayout } from '@/components/layout/public-page-layout'
import { Button } from '@/components/ui/button'
import { useAuthCheck } from '@/hooks/use-profile'

export default function HomePage() {
  const router = useRouter()
  const brand = useBrand()
  const authCheck = useAuthCheck()
  const { user, isAdmin } = authCheck.data ?? { user: null, isAdmin: false }

  useEffect(() => {
    if (authCheck.isLoading) return
    if (user) {
      router.push(isAdmin ? '/admin' : '/profile')
    }
  }, [authCheck.isLoading, user, isAdmin, router])

  return (
    <PublicPageLayout
      showFooter={false}
      containerProps={{ maxWidth: 'narrow', className: '!py-0' }}
    >
      {/* Background com orbs e grid */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground-hsl, 222 47% 11%)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground-hsl, 222 47% 11%)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Orb principal — indigo */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: 'hsl(239 84% 67%)' }}
        />
        {/* Orb secundário — violet */}
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: 'hsl(262 83% 58%)' }}
        />
      </div>

      <section className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-full flex flex-col items-center text-center gap-8">
          {/* Logo */}
          <div className="flex w-full justify-center">
            <BrandMark priority imageClassName="h-9 w-auto max-w-full opacity-90" />
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-2xl px-1">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-gradient-primary wrap-break-word">
              {brand.name}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto wrap-break-word">
              {brand.tagline}
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={() => router.push('/login')}
            size="lg"
            className="min-w-[220px] h-12 text-base shadow-lg shadow-primary/20"
          >
            Acessar minha conta
          </Button>

          {/* Pills de confiança */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['Pix', 'Boleto', 'Cartão de crédito'].map((method) => (
              <span
                key={method}
                className="text-xs text-muted-foreground border border-border/60 rounded-full px-3 py-1 bg-background/60 backdrop-blur-sm"
              >
                {method}
              </span>
            ))}
          </div>

          <ProcessedBy />

          {brand.companyLine ? (
            <p className="max-w-md px-2 text-xs text-muted-foreground/80 wrap-break-word">
              {brand.companyLine}
            </p>
          ) : null}
        </div>
      </section>
    </PublicPageLayout>
  )
}
