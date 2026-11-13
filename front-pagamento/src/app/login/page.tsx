import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginScreen } from '@/components/auth/login-screen'
import { devMailboxForAdmin } from '@/lib/auth/dev-mailbox'
import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { safeMcpReturnPath } from '@/lib/mcp/auth/safe-return-path'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const nextPath = safeMcpReturnPath((await searchParams).next)
  const cookieStore = await cookies()
  const session = await findActiveSession(
    cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  )

  if (session?.isAdmin) redirect(nextPath ?? '/admin')
  if (session) redirect('/profile')

  return <LoginScreen nextPath={nextPath} devMailbox={devMailboxForAdmin()} />
}
