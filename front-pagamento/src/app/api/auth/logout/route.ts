import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { revokeSession } from '@/lib/auth/session'
import { clearSessionCookie } from '@/lib/auth/session-cookie'
import { publicEnv } from '@/lib/config/env'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  await revokeSession(token)
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
