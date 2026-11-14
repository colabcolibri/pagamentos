import { describe, expect, it } from 'vitest'

import { renderEmailDocument } from './document'
import { generateEmailHtml, generatePlatformSaleHtml } from './templates'
import type { EmailTemplateData } from './types'

const data: EmailTemplateData = {
  userName: 'Ana',
  productName: 'Curso',
  priceDisplay: 'R$ 10,00',
  orderId: 'pedido-1',
  paymentMethod: 'PIX',
  subject: 'Pedido criado',
  fromName: 'Oficina Norte',
  customMessage: 'Seu pedido foi criado.',
}

describe('templates de e-mail', () => {
  it('coloca qualquer corpo dentro do mesmo documento', () => {
    const html = renderEmailDocument({
      title: 'Aviso',
      brandName: 'Oficina Norte',
      body: '<p>corpo único</p>',
    })

    expect(html.match(/<!DOCTYPE html>/g)).toHaveLength(1)
    expect(html).toContain('corpo único')
    expect(html).toContain('Este é um e-mail automático.')
  })

  it('embrulha o pedido no layout da marca', () => {
    const html = generateEmailHtml(data)

    expect(html).toContain('Oficina Norte')
    expect(html).toContain('Seu pedido foi criado.')
    expect(html).toContain('pedido-1')
  })

  it('embrulha o aviso interno no mesmo layout', () => {
    const html = generatePlatformSaleHtml({
      orderId: 'pedido-1',
      productName: 'Curso',
      customerEmail: 'ana@quitou.local',
      customerName: 'Ana',
      priceDisplay: 'R$ 10,00',
      paymentMethod: 'PIX',
    })

    expect(html).toContain('Pagamento confirmado')
    expect(html).toContain('ana@quitou.local')
  })

  it('aplica marca, rodapé personalizado e linha da empresa nos templates', () => {
    const html = generatePlatformSaleHtml({
      orderId: 'pedido-2',
      productName: 'Mentoria',
      customerEmail: 'bia@exemplo.com',
      customerName: 'Bia',
      priceDisplay: 'R$ 99,00',
      paymentMethod: 'Cartão',
      brandName: 'Acme Pagamentos',
      footerText: 'Enviado por Acme Pagamentos',
      companyLine: 'Acme Ltda — CNPJ 00.000.000/0001-00',
    })

    expect(html).toContain('Acme Pagamentos')
    expect(html).toContain('Enviado por Acme Pagamentos')
    expect(html).toContain('Acme Ltda — CNPJ 00.000.000/0001-00')
    expect(html).not.toContain('Quitou')
  })
})
