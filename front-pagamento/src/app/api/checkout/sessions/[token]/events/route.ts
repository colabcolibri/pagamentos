import { NextResponse } from 'next/server'

import {
  createSessionStatusSseStream,
  readMinimalSessionStatusByToken,
} from '@/lib/checkout-sessions/status-stream'
import { allowRequest, clientAddress, isApiRateLimitDisabled } from '@/lib/security/api-rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isApiRateLimitDisabled()) {
    const ip = clientAddress(request.headers, null)
    if (!allowRequest('checkout-session-sse', ip, 20, 60_000)) {
      return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 })
    }
  }

  const { token } = await params
  if (!token || token.length < 16 || token.length > 256) {
    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
  }

  const initial = await readMinimalSessionStatusByToken(token)
  if (!initial) {
    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
  }

  const stream = createSessionStatusSseStream({
    loadStatus: () => readMinimalSessionStatusByToken(token),
    signal: request.signal,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
