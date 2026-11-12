import { NextResponse } from 'next/server'

import { isPublicHttpsWebhookUrl } from '@quitou/core/product-webhook'

export async function rejectPrivateWebhookUrl(
  url: string | null | undefined
): Promise<NextResponse | null> {
  if (!url) return null
  if (await isPublicHttpsWebhookUrl(url)) return null
  return NextResponse.json(
    { error: 'A URL de webhook precisa ser HTTPS e apontar para um host público.' },
    { status: 400 }
  )
}
