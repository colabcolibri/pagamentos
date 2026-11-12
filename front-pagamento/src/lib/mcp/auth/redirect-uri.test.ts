import { describe, expect, it } from 'vitest'

import { isAllowedRedirectUri } from './redirect-uri'

describe('isAllowedRedirectUri', () => {
  it('aceita https e localhost', () => {
    expect(isAllowedRedirectUri('https://cursor.com/callback')).toBe(true)
    expect(isAllowedRedirectUri('http://127.0.0.1:3000/cb')).toBe(true)
  })

  it('recusa endereço aberto, IP privado em https e credencial na url', () => {
    expect(isAllowedRedirectUri('http://evil.example/cb')).toBe(false)
    expect(isAllowedRedirectUri('https://10.0.0.1/cb')).toBe(false)
    expect(isAllowedRedirectUri('https://169.254.169.254/cb')).toBe(false)
    expect(isAllowedRedirectUri('https://user:pass@cursor.com/cb')).toBe(false)
    expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false)
  })
})
