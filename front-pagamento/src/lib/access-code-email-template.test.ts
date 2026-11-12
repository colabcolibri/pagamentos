import { describe, expect, it } from 'vitest'

import { renderAccessCodeEmail } from './access-code-email-template'

describe('e-mail do código de acesso', () => {
  it('mostra os 6 dígitos e não oferece link', () => {
    const { html, text } = renderAccessCodeEmail('123456', 'Oficina Norte')

    expect(html).toContain('>1<')
    expect(html).toContain('>6<')
    expect(html).not.toContain('href=')
    expect(html).toContain('Não existe link de acesso')
    expect(text).toContain('123456')
    expect(text).not.toContain('http')
  })
})
