import { NextResponse } from 'next/server'

import { loadInstanceConfig } from '@/lib/platform/instance-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await loadInstanceConfig()
  if (!config.logoMime || !config.logoBase64) {
    return new NextResponse(null, { status: 404 })
  }

  const bytes = Buffer.from(config.logoBase64, 'base64')
  const headers = new Headers({
    'Content-Type': config.logoMime,
    'Content-Length': String(bytes.length),
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
  })

  if (config.logoMime === 'image/svg+xml') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
  }

  return new NextResponse(bytes, { status: 200, headers })
}
