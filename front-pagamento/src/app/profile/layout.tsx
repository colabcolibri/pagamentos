import { ReactNode } from 'react'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = await findActiveSession(
    cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  )

  if (!session) {
    redirect('/login')
  }

  return <>{children}</>
}
