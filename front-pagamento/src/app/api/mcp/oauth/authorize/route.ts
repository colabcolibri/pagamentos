import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { clientAllows } from '@/lib/mcp/auth/oauth-store'
import { safeMcpReturnPath } from '@/lib/mcp/auth/safe-return-path'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const clientId = url.searchParams.get('client_id') ?? ''
  const redirectUri = url.searchParams.get('redirect_uri') ?? ''
  const challenge = url.searchParams.get('code_challenge') ?? ''
  const method = url.searchParams.get('code_challenge_method') ?? ''
  const state = url.searchParams.get('state') ?? ''
  if (
    url.searchParams.get('response_type') !== 'code' ||
    method !== 'S256' ||
    !clientId ||
    !challenge ||
    challenge.length > 200 ||
    state.length > 200
  ) {
    return NextResponse.json({ error: 'Pedido de autorização inválido' }, { status: 400 })
  }
  if (!(await clientAllows(clientId, redirectUri))) {
    return NextResponse.json({ error: 'Cliente ou retorno não cadastrado' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const session = await findActiveSession(
    cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
  )
  const returnPath = `${url.pathname}${url.search}`
  if (!session) {
    const login = new URL('/login', publicEnv.NEXT_PUBLIC_APP_URL)
    const next = safeMcpReturnPath(returnPath)
    if (next) login.searchParams.set('next', next)
    return NextResponse.redirect(login)
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Só um admin conecta o MCP' }, { status: 403 })
  }

  const consent = new URL('/admin/mcp/consent', publicEnv.NEXT_PUBLIC_APP_URL)
  consent.searchParams.set('client_id', clientId)
  consent.searchParams.set('redirect_uri', redirectUri)
  consent.searchParams.set('code_challenge', challenge)
  if (state) consent.searchParams.set('state', state)
  return NextResponse.redirect(consent)
}
