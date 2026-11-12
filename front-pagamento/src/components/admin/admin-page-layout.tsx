'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'

interface AdminPageLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminPageLayout({ children, title, subtitle, action }: AdminPageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Header simples - apenas botão do sidebar */}
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <SidebarTrigger />
      </header>

      {/* Hero Section - Título e Subtítulo */}
      <div className="bg-muted/40 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
          </div>
        </div>
      </div>

      {/* Conteúdo - sem overflow horizontal */}
      <main className="flex-1 bg-muted/40 min-w-0 overflow-x-hidden">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 w-full max-w-full min-w-0 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
