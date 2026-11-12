import { describe, expect, it } from 'vitest'

import {
  isSameOriginConsentRequest,
  signMcpConsentToken,
  verifyMcpConsentToken,
} from './consent-csrf'

describe('consent-csrf', () => {
  const binding = {
    profileId: 'admin-1',
    clientId: 'client-1',
    redirectUri: 'https://cursor.com/callback',
    codeChallenge: 'challenge-123',
    state: 'state-abc',
  }

  it('aceita token assinado para o mesmo admin e parâmetros dentro da janela', () => {
    const now = 1_700_000_000_000
    const token = signMcpConsentToken(binding, now)
    expect(verifyMcpConsentToken(token, binding, now + 30_000)).toBe(true)
  })

  it('recusa token expirado ou se redirect_uri/clientId/profileId mudarem', () => {
    const now = 1_700_000_000_000
    const token = signMcpConsentToken(binding, now)
    expect(verifyMcpConsentToken(token, binding, now + 11 * 60 * 1000)).toBe(false)
    expect(
      verifyMcpConsentToken(token, { ...binding, redirectUri: 'https://evil.example/cb' }, now)
    ).toBe(false)
    expect(verifyMcpConsentToken(token, { ...binding, profileId: 'admin-2' }, now)).toBe(false)
  })

  it('valida Origin contra a URL da requisição', () => {
    const okReq = new Request('https://pagamentos.quitou.com.br/api/mcp/oauth/consent', {
      method: 'POST',
      headers: { origin: 'https://pagamentos.quitou.com.br' },
    })
    const crossSiteReq = new Request('https://pagamentos.quitou.com.br/api/mcp/oauth/consent', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    })
    expect(isSameOriginConsentRequest(okReq)).toBe(true)
    expect(isSameOriginConsentRequest(crossSiteReq)).toBe(false)
  })
})
