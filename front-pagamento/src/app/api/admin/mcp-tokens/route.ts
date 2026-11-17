import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import {
  createPersonalToken,
  listTokens,
  revokeToken,
  updateTokenPolicy,
} from '@/lib/mcp/auth/oauth-store'

const revokeSchema = z.object({ id: z.string().uuid() })
const createSchema = z.object({
  label: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres').max(80),
  expiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
})
const updatePolicySchema = z.object({
  id: z.string().uuid(),
  customPolicy: z
    .record(
      z.string(),
      z.object({
        read: z.boolean(),
        upsert: z.boolean(),
        delete: z.boolean(),
      })
    )
    .nullable(),
})

export const GET = createApiHandler(
  async () => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    return NextResponse.json({ tokens: await listTokens(auth.user.id) })
  },
  { module: 'admin', action: 'mcp_tokens_get' }
)

export const PUT = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
        { status: 400 }
      )
    }

    const created = await createPersonalToken({
      profileId: auth.user.id,
      label: parsed.data.label,
      expiresInDays: parsed.data.expiresInDays ?? null,
    })

    return NextResponse.json({ token: created }, { status: 201 })
  },
  { module: 'admin', action: 'mcp_tokens_create' }
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

export const PATCH = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    const parsed = updatePolicySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    const updated = await updateTokenPolicy({
      id: parsed.data.id,
      profileId: auth.user.id,
      customPolicy: parsed.data.customPolicy,
    })
    if (!updated) return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })
    return NextResponse.json({ token: updated })
  },
  { module: 'admin', action: 'mcp_tokens_policy_patch' }
)
