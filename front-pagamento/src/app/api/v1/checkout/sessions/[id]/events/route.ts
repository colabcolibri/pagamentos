import { NextResponse } from 'next/server'

import { authenticateCheckoutApiKey } from '@/lib/checkout-sessions/service'
import {
  createSessionStatusSseStream,
  readMinimalSessionStatusById,
} from '@/lib/checkout-sessions/status-stream'
import { validateUuidParam } from '@/lib/validators/helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = await authenticateCheckoutApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: 'API key ausente, inválida ou revogada' }, { status: 401 })
  }

  const { id } = await params
  const invalid = validateUuidParam(id)
  if (invalid) return invalid

  const initial = await readMinimalSessionStatusById({
    sessionId: id,
    allowedProductIds: apiKey.allowedProductIds,
  })

  if (!initial.found) {
    return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
  }
  if (initial.forbidden) {
    return NextResponse.json({ error: 'Chave não autorizada para esta sessão' }, { status: 403 })
  }

  const stream = createSessionStatusSseStream({
    loadStatus: async () => {
      const res = await readMinimalSessionStatusById({
        sessionId: id,
        allowedProductIds: apiKey.allowedProductIds,
      })
      return res.event
    },
    signal: request.signal,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
