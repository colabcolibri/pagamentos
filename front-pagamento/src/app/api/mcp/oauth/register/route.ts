import { NextResponse } from 'next/server'

import { registerClient } from '@/lib/mcp/auth/oauth-store'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { redirect_uris?: unknown } | null
  if (
    !body ||
    !Array.isArray(body.redirect_uris) ||
    body.redirect_uris.some((uri) => typeof uri !== 'string')
  ) {
    return NextResponse.json({ error: 'redirect_uris inválido' }, { status: 400 })
  }
  const client = await registerClient(body.redirect_uris)
  if (!client) {
    return NextResponse.json({ error: 'Endereço de retorno não aceito' }, { status: 400 })
  }
  return NextResponse.json(client, { status: 201 })
}
