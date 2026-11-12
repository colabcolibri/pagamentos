import { isIPv4, isIPv6 } from 'node:net'

/**
 * Bloqueia URLs obviamente perigosas para fetch server-side (SSRF).
 * Não substitui WAF; reduz superfície para IPs privados e metadados comuns.
 */
export function isUrlSafeForServerSideFetch(urlString: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === 'metadata' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return false
  }
  if (isIPv4(host)) {
    return !isPrivateOrReservedIpv4(host)
  }
  if (isIPv6(host)) {
    return !isPrivateOrReservedIpv6(host)
  }
  return true
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateOrReservedIpv6(host: string): boolean {
  const h = host.toLowerCase()
  if (h === '::1') return true
  if (h.startsWith('fe80:')) return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true
  if (h.startsWith('::ffff:')) {
    const v4 = h.slice(7)
    if (isIPv4(v4)) return isPrivateOrReservedIpv4(v4)
  }
  return false
}
