import { ReactNode } from 'react'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { AppSidebar } from '@/components/admin/app-sidebar'
import { QueryProvider } from '@/components/providers/query-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { safeMcpReturnPath } from '@/lib/mcp/auth/safe-return-path'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = await findActiveSession(
    cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  )

  if (!session) {
    const next = safeMcpReturnPath((await headers()).get('x-quitou-path'))
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  }

  if (!session.isAdmin) {
    redirect('/unauthorized')
  }

  // ✅ Passou em todas validações - renderizar com sidebar
  // QueryProvider garante que AppSidebar (useCurrentAdmin/useQuery) tenha contexto
  return (
    <QueryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  )
}
