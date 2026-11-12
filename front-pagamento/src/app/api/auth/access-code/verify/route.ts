import { NextResponse } from 'next/server'

import { sessionCookieValue, verifyAccessCode } from '@/lib/auth/access-code'
import { ensureConfiguredAdmin } from '@/lib/auth/configured-admin'
import { setSessionCookie } from '@/lib/auth/session-cookie'
import { serverEnv } from '@/lib/config/env'
import { withTransaction } from '@/lib/db/pool'
import { databaseErrorResponse } from '@/lib/errors/error-handler'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; code?: string } | null
  if (!body?.email || !body.code) {
    return NextResponse.json({ error: 'E-mail e código são obrigatórios' }, { status: 400 })
  }

  try {
    const result = await withTransaction(async (client) => {
      const verified = await verifyAccessCode(client, {
        email: body.email!,
        code: body.code!,
        codeSecret: serverEnv.ACCESS_CODE_SECRET,
      })
      if (verified.ok) {
        await ensureConfiguredAdmin(client, { profileId: verified.profileId, email: body.email! })
      }
      return verified
    })
    const token = sessionCookieValue(result)
    if (!token) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
    }
    await setSessionCookie(token)
    return NextResponse.json({ ok: true })
  } catch {
    return databaseErrorResponse()
  }
}
