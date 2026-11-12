import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  const session = await findActiveSession(token)
  if (!session) {
    return NextResponse.json({ user: null, isAdmin: false })
  }
  return NextResponse.json({
    user: { id: session.profileId, email: session.email, name: session.name ?? '' },
    isAdmin: session.isAdmin,
    role: session.role ?? null,
  })
}
