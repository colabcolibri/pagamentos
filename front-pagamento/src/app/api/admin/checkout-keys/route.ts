import { NextResponse } from 'next/server'

import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { createCheckoutApiKey, listCheckoutApiKeys } from '@/lib/checkout-sessions/api-keys'
import { createApiHandler } from '@/lib/errors'

const createKeySchema = z.object({
  label: z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres').max(80),
  allowedProductIds: z.array(z.string().uuid()).nullable().optional(),
})

export const GET = createApiHandler(
  async () => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response
    const keys = await listCheckoutApiKeys()
    return NextResponse.json({ keys })
  },
  { module: 'admin', action: 'checkout_keys_list' }
)

export const POST = createApiHandler(
  async (request: Request) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const parsed = createKeySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Payload inválido' },
        { status: 400 }
      )
    }

    const created = await createCheckoutApiKey({
      label: parsed.data.label,
      allowedProductIds: parsed.data.allowedProductIds ?? null,
      actorId: auth.user.id,
    })

    return NextResponse.json(created, { status: 201 })
  },
  { module: 'admin', action: 'checkout_keys_create' }
)
