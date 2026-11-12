import type { CheckoutDatabase, CheckoutSession } from '@quitou/core'
import 'server-only'

import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { getPool, withTransaction } from '@/lib/db/pool'

export function createCheckoutDatabase(): CheckoutDatabase {
  return {
    query: (sql, params) => getPool().query(sql, params),
    transaction: (fn) => withTransaction((client) => fn(client)),
  }
}

export async function findCheckoutSession(request: Request): Promise<CheckoutSession | null> {
  const header = request.headers.get('cookie') ?? ''
  const name = publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME
  const raw = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
  const session = await findActiveSession(raw ? decodeURIComponent(raw) : undefined)
  if (!session) return null
  return { userId: session.profileId, email: session.email }
}
