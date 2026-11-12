'use client'

import Image from 'next/image'
import Link from 'next/link'

import { BrandMark } from '@/components/brand/brand-mark'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthCheck } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

// ============================================================================
// CONTEÚDO
// ============================================================================
const CONTENT = {
  buttons: {
    login: 'Entrar',
    profile: 'Perfil',
    adminPanel: 'Painel',
  },
} as const

/** Ações de sessão (getUser + RPC admin): use com `actions` quando precisar compor (ex.: checkout + voltar). */
export function PublicHeaderAuthActions() {
  const auth = useAuthCheck()

  if (auth.isPending) {
    return (
      <Skeleton
        className="h-8 w-22 rounded-md shrink-0"
        aria-busy="true"
        aria-label="Carregando sessão"
      />
    )
  }

  if (auth.isError) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline">
          {CONTENT.buttons.login}
        </Button>
      </Link>
    )
  }

  const user = auth.data?.user ?? null
  const isAdmin = auth.data?.isAdmin ?? false

  if (!user) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline">
          {CONTENT.buttons.login}
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 min-w-0 max-w-full">
      <Button variant="outline" size="sm" asChild className="shrink-0">
        <Link href={isAdmin ? '/admin' : '/profile'}>
          {isAdmin ? CONTENT.buttons.adminPanel : CONTENT.buttons.profile}
        </Link>
      </Button>
      <LogoutButton compact />
    </div>
  )
}

export interface PublicHeaderProps {
  logo?: {
    src: string
    alt: string
    width?: number
    height?: number
  }
  navItems?: Array<{
    label: string
    href: string
  }>
  actions?: React.ReactNode
  className?: string
}

// ============================================================================
// COMPONENTE
// ============================================================================
export function PublicHeader({ logo, navItems, actions, className }: PublicHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60',
        className
      )}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6 lg:px-8 overflow-x-hidden">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <Link href="/" className="min-w-0 max-w-40 sm:max-w-56">
            {logo ? (
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width || 120}
                height={logo.height || 30}
                className="h-6 w-auto max-w-full"
              />
            ) : (
              <BrandMark />
            )}
          </Link>
        </div>

        {navItems && navItems.length > 0 && (
          <nav className="ml-6 hidden md:flex items-center gap-6 shrink-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0 min-w-0 max-w-[min(100%,28rem)] sm:max-w-none justify-end">
          {actions ?? <PublicHeaderAuthActions />}
        </div>
      </div>
    </header>
  )
}
