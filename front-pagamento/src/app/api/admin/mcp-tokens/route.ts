import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { listTokens, revokeToken } from '@/lib/mcp/auth/oauth-store'

const revokeSchema = z.object({ id: z.string().uuid() })

export const GET = createApiHandler(
  async () => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    return NextResponse.json({ tokens: await listTokens(auth.user.id) })
  },
  { module: 'admin', action: 'mcp_tokens_get' }
)

export const POST = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    const parsed = revokeSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    const revoked = await revokeToken(parsed.data.id, auth.user.id)
    if (!revoked) return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
    return NextResponse.json({ revoked: true })
  },
  { module: 'admin', action: 'mcp_tokens_revoke' }
)
