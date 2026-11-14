/**
 * Single-flight in-memory TTL cache for server-side configuration loaders.
 * Deduplicates concurrent cold loads and supports explicit invalidation on writes.
 */
export interface TtlCache<T> {
  get: () => Promise<T>
  invalidate: () => void
}

export function createTtlCache<T>(ttlMs: number, loader: () => Promise<T>): TtlCache<T> {
  let cached: { value: T; expiresAt: number } | null = null
  let inFlight: Promise<T> | null = null

  return {
    async get(): Promise<T> {
      const now = Date.now()
      if (cached && now < cached.expiresAt) {
        return cached.value
      }
      if (inFlight) {
        return inFlight
      }

      inFlight = loader()
        .then((value) => {
          cached = { value, expiresAt: Date.now() + ttlMs }
          return value
        })
        .finally(() => {
          inFlight = null
        })

      return inFlight
    },

    invalidate(): void {
      cached = null
      inFlight = null
    },
  }
}
