import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const sendMail = vi.fn().mockResolvedValue(undefined)

vi.mock('@quitou/core/email', () => ({
  createEmailTransporter: vi.fn(() => ({
    sendMail,
  })),
}))

vi.mock('@/lib/contact-email-template', () => ({
  renderFaleConoscoEmail: vi.fn(() => ({
    html: '<p>html</p>',
    text: 'text',
  })),
}))

describe('POST /api/contact', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    sendMail.mockClear()
  })

  it('retorna 400 quando body é inválido', async () => {
    const res = await POST(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', email: 'bad', message: 'curto' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('recusa quando o contato da instância não está configurado', async () => {
    vi.stubEnv('BRAND_CONTACT_EMAIL', '')
    const res = await POST(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Maria Silva',
          email: 'maria@example.com',
          message: 'Mensagem com mais de dez caracteres para validar o formulário.',
        }),
      })
    )
    expect(res.status).toBe(422)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('envia email e retorna sucesso com payload válido', async () => {
    vi.stubEnv('BRAND_CONTACT_EMAIL', 'contato@oficina.example')
    vi.stubEnv('BRAND_NAME', 'Oficina Norte')
    const res = await POST(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Maria Silva',
          email: 'maria@example.com',
          message: 'Mensagem com mais de dez caracteres para validar o formulário.',
        }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'contato@oficina.example',
        replyTo: 'maria@example.com',
      })
    )
  })
})
