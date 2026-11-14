'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ChevronRight } from 'lucide-react'

import { AdminCommandMenu } from '@/components/admin/admin-command-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const CONTENT = {
  breadcrumbLabel: 'Breadcrumb',
  adminRoot: 'Admin',
  routes: {
    '/admin': 'Dashboard',
    '/admin/products': 'Produtos',
    '/admin/payments': 'Pagamentos',
    '/admin/orders': 'Pedidos',
    '/admin/coupons': 'Cupons',
    '/admin/subscriptions': 'Assinaturas',
    '/admin/webhooks': 'Webhooks',
    '/admin/audit': 'Trilha',
    '/admin/emails': 'Emails enviados',
    '/admin/admins': 'Administradores',
    '/admin/settings': 'Configurações',
  } as Record<string, string>,
} as const

interface AdminPageLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminPageLayout({ children, title, subtitle, action }: AdminPageLayoutProps) {
  const pathname = usePathname()
  const currentLabel = CONTENT.routes[pathname] ?? title
  const isRoot = pathname === '/admin'

  return (
    <div className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Topbar compacta com trigger, breadcrumb e busca rápida */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <nav
            aria-label={CONTENT.breadcrumbLabel}
            className="flex min-w-0 items-center gap-1.5 text-sm"
          >
            <Link
              href="/admin"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {CONTENT.adminRoot}
            </Link>
            {!isRoot && (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                <span className="truncate font-medium text-foreground">{currentLabel}</span>
              </>
            )}
          </nav>
        </div>

        <AdminCommandMenu />
      </header>

      {/* Scroll vertical premium com overlay do Base UI */}
      <ScrollArea
        orientation="vertical"
        className="flex-1 min-h-0 w-full min-w-0"
        contentClassName="min-h-full"
      >
        <main className="w-full min-w-0 max-w-full overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 md:px-6 lg:px-8 space-y-6">
            {/* Cabeçalho da página enxuto e alinhado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
            </div>

            {/* Área de trabalho */}
            <div className="min-w-0">{children}</div>
          </div>
        </main>
      </ScrollArea>
    </div>
  )
}
