type RateLimitEntry = { count: number; resetAt: number }

const stores = new Map<string, Map<string, RateLimitEntry>>()

export function isApiRateLimitDisabled(): boolean {
  const flag = process.env.DISABLE_API_RATE_LIMIT
  if (flag === '1' || flag === 'true') return true
  if (process.env.NODE_ENV !== 'production') return true
  return false
}

export function isTrustedProxy(): boolean {
  return process.env.TRUSTED_PROXY === '1' || process.env.TRUSTED_PROXY === 'true'
}

export function clientAddress(
  headers: {
    get(name: string): string | null
  },
  connectionIp: string | null
): string {
  if (isTrustedProxy()) {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    const realIp = headers.get('x-real-ip')
    if (realIp) return realIp.trim()
  }
  return connectionIp?.trim() || 'direct'
}

const MAX_ENTRIES_PER_BUCKET = 5_000

function evictExpiredEntries(store: Map<string, RateLimitEntry>, now: number): void {
  for (const [k, v] of store.entries()) {
    if (now >= v.resetAt) {
      store.delete(k)
    }
  }
  if (store.size > MAX_ENTRIES_PER_BUCKET) {
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) {
      store.delete(oldestKey)
    }
  }
}

export function allowRequest(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  let store = stores.get(bucket)
  if (!store) {
    store = new Map()
    stores.set(bucket, store)
  }
  const now = Date.now()
  if (store.size >= 512) {
    evictExpiredEntries(store, now)
  }
  let entry = store.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(key, entry)
  }
  entry.count += 1
  return entry.count <= limit
}

export function resetRateLimits(): void {
  stores.clear()
}

export function authAttemptAllowed(kind: 'request' | 'verify', ip: string, email: string): boolean {
  const emailLimit = kind === 'request' ? 5 : 10
  const emailWindow = 10 * 60_000
  const ipOk = allowRequest(`auth-${kind}-ip`, ip, 10, 60_000)
  const mail = email.trim().toLowerCase() || 'sem-email'
  return ipOk && allowRequest(`auth-${kind}-email`, mail, emailLimit, emailWindow)
}
