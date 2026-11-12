import { isUrlSafeForServerSideFetch } from '@/lib/security/safe-fetch-url'

export function isAllowedRedirectUri(value: string): boolean {
  if (value.length > 300 || value.includes('\\') || value.includes('#')) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.username || url.password) return false
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol === 'http:' && local) return true
  if (url.protocol !== 'https:' || local) return false
  if (!isUrlSafeForServerSideFetch(value)) return false

  const allowlistRaw = process.env.MCP_ALLOWED_REDIRECT_HOSTS?.trim()
  if (allowlistRaw) {
    const allowedHosts = allowlistRaw
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
    const host = url.hostname.toLowerCase()
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  }
  return true
}
