import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { isSameOriginConsentRequest, verifyMcpConsentToken } from '@/lib/mcp/auth/consent-csrf'
import { clientAllows, issueAuthCode } from '@/lib/mcp/auth/oauth-store'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  if (!isSameOriginConsentRequest(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida' }, { status: 403 })
  }

  const form = await request.formData()
  const clientId = String(form.get('client_id') ?? '')
  const redirectUri = String(form.get('redirect_uri') ?? '')
  const challenge = String(form.get('code_challenge') ?? '')
  const state = String(form.get('state') ?? '')
  const csrfToken = String(form.get('csrf_token') ?? '')
  const decision = String(form.get('decision') ?? '')
  if (!clientId || !redirectUri || !challenge || challenge.length > 200 || state.length > 200) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  if (
    !verifyMcpConsentToken(csrfToken, {
      profileId: auth.user.id,
      clientId,
      redirectUri,
      codeChallenge: challenge,
      state,
    })
  ) {
    return NextResponse.json(
      { error: 'Token de consentimento inválido ou expirado' },
      { status: 403 }
    )
  }
  if (!(await clientAllows(clientId, redirectUri))) {
    return NextResponse.json({ error: 'Cliente ou retorno não cadastrado' }, { status: 400 })
  }

  const target = new URL(redirectUri)
  if (decision !== 'allow') {
    target.searchParams.set('error', 'access_denied')
    if (state) target.searchParams.set('state', state)
    return NextResponse.redirect(target, 303)
  }

  const code = await issueAuthCode({
    clientId,
    profileId: auth.user.id,
    redirectUri,
    codeChallenge: challenge,
  })
  target.searchParams.set('code', code)
  if (state) target.searchParams.set('state', state)
  return NextResponse.redirect(target, 303)
}
