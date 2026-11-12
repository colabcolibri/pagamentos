import { cookies } from 'next/headers'

import 'server-only'

import { publicEnv, serverEnv } from '@/lib/config/env'

import { SESSION_TTL_MS } from './access-code'

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: serverEnv.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    ...(publicEnv.NEXT_PUBLIC_COOKIE_DOMAIN ? { domain: publicEnv.NEXT_PUBLIC_COOKIE_DOMAIN } : {}),
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: serverEnv.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(publicEnv.NEXT_PUBLIC_COOKIE_DOMAIN ? { domain: publicEnv.NEXT_PUBLIC_COOKIE_DOMAIN } : {}),
  })
}
