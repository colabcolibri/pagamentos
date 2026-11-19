import { NextResponse } from 'next/server'

import { z } from 'zod'

import { verifyAccessCodeForSessionEmail } from '@/lib/checkout-sessions/email-proof'
import { getPublicCheckoutSessionByToken } from '@/lib/checkout-sessions/public-read'
import { createApiHandlerWithParams } from '@/lib/errors'
import { allowRequest, clientAddress, isApiRateLimitDisabled } from '@/lib/security/api-rate-limit'

const verifySchema = z.object({
  email: z.string().trim().email(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
})

export const POST = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ token: string }> }) => {
    if (!isApiRateLimitDisabled()) {
      const ip = clientAddress(request.headers, null)
      if (!allowRequest('checkout-session-verify', ip, 10, 60_000)) {
        return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 })
      }
    }

    const { token } = await params
    const sessionLookup = await getPublicCheckoutSessionByToken(token)
    if (!sessionLookup.ok) {
      return NextResponse.json({ error: sessionLookup.error }, { status: sessionLookup.status })
    }

    const parsed = verifySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail ou código inválido' }, { status: 400 })
    }

    const verified = await verifyAccessCodeForSessionEmail({
      sessionId: sessionLookup.session.sessionId,
      email: parsed.data.email,
      code: parsed.data.code,
    })

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 })
    }

    return NextResponse.json({ proof: verified.proof, email: parsed.data.email.toLowerCase() })
  },
  { module: 'checkout_sessions', action: 'verify_email' }
)
