import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { createApiHandler } from '@/lib/errors'
import { readPolicyView, savePolicy } from '@/lib/mcp/policy/store'

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  policies: z
    .record(
      z.string(),
      z.object({
        read: z.boolean().optional(),
        upsert: z.boolean().optional(),
        delete: z.boolean().optional(),
      })
    )
    .optional(),
})

export const GET = createApiHandler(
  async () => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    return NextResponse.json(await readPolicyView())
  },
  { module: 'admin', action: 'mcp_policy_get' }
)

export const PATCH = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    return NextResponse.json(await savePolicy(parsed.data))
  },
  { module: 'admin', action: 'mcp_policy_patch' }
)
