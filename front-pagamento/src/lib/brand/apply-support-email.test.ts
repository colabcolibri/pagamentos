import { describe, expect, it } from 'vitest'

import { applySupportEmail, applySupportEmailDeep } from '@/lib/brand/apply-support-email'

describe('applySupportEmail', () => {
  it('troca o marcador pelo e-mail de suporte', () => {
    expect(applySupportEmail('Escreva para {{support_email}}.', 'suporte@oficina.example')).toBe(
      'Escreva para suporte@oficina.example.'
    )
  })

  it('usa um texto de exemplo quando o suporte não está configurado', () => {
    expect(applySupportEmail('Escreva para {{support_email}}.', '  ')).toBe(
      'Escreva para e-mail de suporte da loja.'
    )
  })

  it('percorre o JSON do modelo', () => {
    const policy = applySupportEmailDeep(
      { steps: ['Fale com {{support_email}}'] },
      'a@oficina.example'
    )
    expect(JSON.stringify(policy)).not.toContain('{{support_email}}')
    expect(JSON.stringify(policy)).toContain('a@oficina.example')
  })
})
