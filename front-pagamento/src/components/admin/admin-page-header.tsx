'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'

export function AdminPageHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <SidebarTrigger />
    </header>
  )
}
