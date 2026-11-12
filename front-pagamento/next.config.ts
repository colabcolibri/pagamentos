import type { NextConfig } from 'next'

import path from 'node:path'

const isProduction = process.env.NODE_ENV === 'production'

function umamiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_UMAMI_SRC?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function buildContentSecurityPolicy(): string {
  const connectSrc = ["'self'", 'https:', 'wss:']
  const scriptSrc = isProduction
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
  const umami = umamiOrigin()
  if (umami) {
    scriptSrc.push(umami)
    connectSrc.push(umami)
  }
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer', '@quitou/core'],
  turbopack: {
    root: path.join(__dirname, '..'),
  },
  async headers() {
    const baseHeaders: { key: string; value: string }[] = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
    ]

    if (isProduction) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/:path*',
        headers: baseHeaders,
      },
    ]
  },
}

export default nextConfig
