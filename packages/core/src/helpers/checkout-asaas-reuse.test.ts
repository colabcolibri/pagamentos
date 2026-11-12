import { describe, expect, it } from 'vitest'

import { isAsaasPendingCheckoutReusable } from './checkout'

describe('isAsaasPendingCheckoutReusable', () => {
  const future = '2099-01-01T00:00:00.000Z'
  const past = '2020-01-01T00:00:00.000Z'

  it('retorna true quando não há pedido (join ausente)', () => {
    expect(isAsaasPendingCheckoutReusable(undefined)).toBe(true)
    expect(isAsaasPendingCheckoutReusable(null)).toBe(true)
  })

  it('retorna false quando pedido soft-deleted', () => {
    expect(isAsaasPendingCheckoutReusable({ deleted_at: '2025-01-01T00:00:00Z', expires_at: future })).toBe(
      false
    )
  })

  it('retorna true quando expires_at ausente (legado)', () => {
    expect(isAsaasPendingCheckoutReusable({ deleted_at: null, expires_at: null })).toBe(true)
  })

  it('retorna false quando expires_at já passou', () => {
    expect(isAsaasPendingCheckoutReusable({ deleted_at: null, expires_at: past }, Date.now())).toBe(false)
  })

  it('retorna true quando expires_at é futuro', () => {
    expect(isAsaasPendingCheckoutReusable({ deleted_at: null, expires_at: future }, Date.now())).toBe(true)
  })
})
