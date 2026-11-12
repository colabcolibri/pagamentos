import { NextResponse } from 'next/server'

import { z } from 'zod'

import { getApiContext } from '@/lib/auth/api-context'
import { previewCheckoutCoupon } from '@/lib/payments/coupon/preview-coupon'

const bodySchema = z.object({
  price_id: z.string().uuid('price_id inválido'),
  checkout_flow: z.enum(['avista', 'parcelado']),
  coupon_code: z.string().min(1, 'Informe o cupom').max(64),
  addon_price_ids: z.array(z.string().uuid('addon_price_id inválido')).optional(),
})

/**
 * Pré-visualização de cupom no Postgres. Não expõe a tabela ao cliente.
 */
export async function POST(request: Request) {
  const ctx = await getApiContext()
  if (ctx instanceof NextResponse) {
    return ctx
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      { error: first ? `${first.path.join('.')}: ${first.message}` : 'Dados inválidos' },
      { status: 400 }
    )
  }

  const result = await previewCheckoutCoupon({
    priceId: parsed.data.price_id,
    flow: parsed.data.checkout_flow,
    couponCode: parsed.data.coupon_code,
    userId: ctx.user.id,
    addonPriceIds: parsed.data.addon_price_ids ?? [],
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.body)
}
