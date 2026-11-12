import { describe, expect, it } from 'vitest'

import { renderFaleConoscoEmail } from '@/lib/contact-email-template'

const message = {
  name: 'Maria',
  email: 'maria@example.com',
  message: 'Quero falar sobre o pedido.',
  brandName: 'Oficina Norte',
}

describe('renderFaleConoscoEmail', () => {
  it('mostra a linha legal quando a instância tem razão social', () => {
    const { html, text } = renderFaleConoscoEmail({
      ...message,
      companyLine: 'Oficina Norte LTDA — CNPJ 00.000.000/0001-00',
    })
    expect(html).toContain('Oficina Norte LTDA')
    expect(html).toContain('Oficina Norte')
    expect(text).toContain('Oficina Norte LTDA')
    expect(html).toContain('00.000.000/0001-00')
  })

  it('omite o rodapé legal quando razão social e CNPJ estão vazios', () => {
    const { html, text } = renderFaleConoscoEmail({ ...message, companyLine: null })
    expect(html).not.toContain('CNPJ')
    expect(text).not.toContain('CNPJ')
  })
})
