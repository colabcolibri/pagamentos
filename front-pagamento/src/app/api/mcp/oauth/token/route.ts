import { NextResponse } from 'next/server'

import { exchangeCode, rotateRefresh } from '@/lib/mcp/auth/oauth-store'

async function readForm(request: Request) {
  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    return (await request.json().catch(() => ({}))) as Record<string, string>
  }
  const form = await request.formData().catch(() => null)
  const data: Record<string, string> = {}
  form?.forEach((value, key) => {
    if (typeof value === 'string') data[key] = value
  })
  return data
}

export async function POST(request: Request) {
  const body = await readForm(request)
  const clientId = body.client_id ?? ''
  if (!clientId) return NextResponse.json({ error: 'invalid_client' }, { status: 400 })

  if (body.grant_type === 'authorization_code') {
    const tokens = await exchangeCode({
      code: body.code ?? '',
      clientId,
      redirectUri: body.redirect_uri ?? '',
      verifier: body.code_verifier ?? '',
    })
    if (!tokens) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    return NextResponse.json(tokens)
  }

  if (body.grant_type === 'refresh_token') {
    const tokens = await rotateRefresh(body.refresh_token ?? '', clientId)
    if (!tokens) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    return NextResponse.json(tokens)
  }

  return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
