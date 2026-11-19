import { NextResponse } from 'next/server'

import { getPublicCheckoutSessionByToken } from '@/lib/checkout-sessions/public-read'
import { createApiHandlerWithParams } from '@/lib/errors'
import { allowRequest, clientAddress, isApiRateLimitDisabled } from '@/lib/security/api-rate-limit'

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
} as const

export const GET = createApiHandlerWithParams(
  async (request: Request, { params }: { params: Promise<{ token: string }> }) => {
    if (!isApiRateLimitDisabled()) {
      const ip = clientAddress(request.headers, null)
      if (!allowRequest('checkout-session-read', ip, 30, 60_000)) {
        return NextResponse.json(
          { error: 'Muitas tentativas. Aguarde um momento.' },
          { status: 429, headers: SECURITY_HEADERS }
        )
      }
    }

    const { token } = await params
    if (!token || token.length < 16 || token.length > 256) {
      return NextResponse.json(
        { error: 'Sessão de pagamento não encontrada' },
        { status: 404, headers: SECURITY_HEADERS }
      )
    }

    const result = await getPublicCheckoutSessionByToken(token)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: SECURITY_HEADERS }
      )
    }

    return NextResponse.json(result.session, { headers: SECURITY_HEADERS })
  },
  { module: 'checkout_sessions', action: 'public_read' }
)
