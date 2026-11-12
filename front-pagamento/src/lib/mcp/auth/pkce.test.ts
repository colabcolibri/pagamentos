import { describe, expect, it } from 'vitest'

import { pkceChallenge, verifyPkce } from './pkce'

describe('verifyPkce', () => {
  it('aceita o verificador que gerou o desafio', () => {
    const verifier = 'abcdefghijklmnopqrstuvwxyz0123456789'
    expect(verifyPkce(verifier, pkceChallenge(verifier))).toBe(true)
  })

  it('recusa um verificador diferente', () => {
    expect(
      verifyPkce(
        'outro-verificador-com-tamanho-ok',
        pkceChallenge('abcdefghijklmnopqrstuvwxyz0123456789')
      )
    ).toBe(false)
  })
})
