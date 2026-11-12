import { NextResponse } from 'next/server'

import { authenticateMcpBearer } from '@/lib/auth/mcp/authenticate-mcp'
import { dispatchMcp, mcpWwwAuthenticate } from '@/lib/mcp/http'

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

export async function POST(request: Request) {
  const principal = await authenticateMcpBearer(request.headers.get('authorization'))
  if (!principal) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Não autenticado' } },
      { status: 401, headers: { 'WWW-Authenticate': mcpWwwAuthenticate() } }
    )
  }

  const body = (await request.json().catch(() => null)) as {
    jsonrpc?: string
    id?: unknown
    method?: string
    params?: unknown
  } | null
  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return rpcError(body?.id, -32700, 'JSON inválido')
  }

  const result = await dispatchMcp(body.method, body.params, principal)
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    const error = result.error as { code: number; message: string }
    return rpcError(body.id, error.code, error.message)
  }
  return NextResponse.json({ jsonrpc: '2.0', id: body.id ?? null, result })
}
