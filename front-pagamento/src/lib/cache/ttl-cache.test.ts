import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTtlCache } from './ttl-cache'

describe('createTtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reutiliza o valor em cache dentro do TTL e recarrega após expirar', async () => {
    let calls = 0
    const cache = createTtlCache(10_000, async () => {
      calls += 1
      return `v${calls}`
    })

    expect(await cache.get()).toBe('v1')
    expect(await cache.get()).toBe('v1')
    expect(calls).toBe(1)

    vi.advanceTimersByTime(10_000)
    expect(await cache.get()).toBe('v2')
    expect(calls).toBe(2)
  })

  it('deduplica chamadas simultâneas (single-flight)', async () => {
    let resolveLoader!: (value: string) => void
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve
        })
    )
    const cache = createTtlCache(10_000, loader)

    const p1 = cache.get()
    const p2 = cache.get()
    expect(loader).toHaveBeenCalledTimes(1)

    resolveLoader('shared')
    await expect(Promise.all([p1, p2])).resolves.toEqual(['shared', 'shared'])
  })

  it('limpa o estado em falha e permite nova tentativa na próxima chamada', async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce('recovered')
    const cache = createTtlCache(10_000, loader)

    await expect(cache.get()).rejects.toThrow('db down')
    expect(await cache.get()).toBe('recovered')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('força recarga imediata após invalidate()', async () => {
    let calls = 0
    const cache = createTtlCache(10_000, async () => {
      calls += 1
      return calls
    })

    expect(await cache.get()).toBe(1)
    cache.invalidate()
    expect(await cache.get()).toBe(2)
  })
})
