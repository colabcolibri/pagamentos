import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { revokeCheckoutApiKey } from '@/lib/checkout-sessions/api-keys'
import { createApiHandlerWithParams } from '@/lib/errors'
import { validateUuidParam } from '@/lib/validators/helpers'

export const POST = createApiHandlerWithParams(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAdmin()
    if (!auth.success) return auth.response

    const { id } = await params
    const invalidId = validateUuidParam(id)
    if (invalidId) return invalidId

    const revoked = await revokeCheckoutApiKey({ id, actorId: auth.user.id })
    if (!revoked) {
      return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ key: revoked })
  },
  { module: 'admin', action: 'checkout_keys_revoke' }
)
