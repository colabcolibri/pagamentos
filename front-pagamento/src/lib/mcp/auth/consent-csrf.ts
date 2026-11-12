import { createHmac, timingSafeEqual } from 'node:crypto'

export type McpConsentBinding = {
  profileId: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}

const CONSENT_CSRF_TTL_MS = 10 * 60 * 1000

function csrfSecret(): string {
  return (
    process.env.ACCESS_CODE_SECRET?.trim() ||
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    'quitou-mcp-consent-csrf-fallback'
  )
}

function canonicalPayload(binding: McpConsentBinding, timestampMs: number): string {
  return [
    String(timestampMs),
    binding.profileId,
    binding.clientId,
    binding.redirectUri,
    binding.codeChallenge,
    binding.state,
  ].join('|')
}

export function signMcpConsentToken(binding: McpConsentBinding, nowMs = Date.now()): string {
  const payload = canonicalPayload(binding, nowMs)
  const mac = createHmac('sha256', csrfSecret()).update(payload, 'utf8').digest('base64url')
  return `${nowMs}.${mac}`
}

export function verifyMcpConsentToken(
  token: string | null | undefined,
  binding: McpConsentBinding,
  nowMs = Date.now()
): boolean {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const tsRaw = Number(token.slice(0, dot))
  const providedSig = token.slice(dot + 1)
  if (!Number.isFinite(tsRaw) || !providedSig) return false
  if (nowMs < tsRaw || nowMs - tsRaw > CONSENT_CSRF_TTL_MS) return false

  const expectedSig = createHmac('sha256', csrfSecret())
    .update(canonicalPayload(binding, tsRaw), 'utf8')
    .digest('base64url')

  const a = Buffer.from(providedSig, 'utf8')
  const b = Buffer.from(expectedSig, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function isSameOriginConsentRequest(request: Request): boolean {
  const originHeader = request.headers.get('origin')?.trim()
  const refererHeader = request.headers.get('referer')?.trim()
  const sourceUrl = originHeader || refererHeader
  if (!sourceUrl) return true

  try {
    const sourceOrigin = new URL(sourceUrl).origin
    const requestOrigin = new URL(request.url).origin
    if (sourceOrigin === requestOrigin) return true
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configuredAppUrl && sourceOrigin === new URL(configuredAppUrl).origin) {
      return true
    }
    return false
  } catch {
    return false
  }
}
