import { emailBrand, escapeEmailHtml, renderEmailDocument } from '@quitou/core/email-document'

export interface FaleConoscoEmailData {
  name: string
  email: string
  message: string
  brandName: string
  companyLine: string | null
}

export function renderFaleConoscoEmail(data: FaleConoscoEmailData): { html: string; text: string } {
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:${emailBrand.muted};">Nova mensagem do formulário Fale conosco</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${emailBrand.border};">
          <span style="font-size:12px;font-weight:600;color:${emailBrand.muted};text-transform:uppercase;letter-spacing:0.05em;">De</span><br>
          <span style="font-size:15px;color:${emailBrand.foreground};">${escapeEmailHtml(data.name)} &lt;${escapeEmailHtml(data.email)}&gt;</span>
        </td>
      </tr>
    </table>
    <div style="padding:20px;background-color:${emailBrand.card};border-radius:6px;border-left:4px solid ${emailBrand.primary};">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${emailBrand.muted};text-transform:uppercase;letter-spacing:0.05em;">Mensagem</p>
      <p style="margin:0;font-size:15px;color:${emailBrand.foreground};white-space:pre-wrap;">${escapeEmailHtml(data.message).replace(/\n/g, '<br>')}</p>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:${emailBrand.muted};">
      Caso queira adicionar algo à sua mensagem, basta responder este e-mail. Você recebeu uma cópia para referência.
    </p>
  `
  const footer = data.companyLine
    ? `<p style="margin:0;font-size:12px;color:${emailBrand.muted};">${escapeEmailHtml(data.companyLine)}</p>`
    : ''

  const text = `
Nova mensagem do formulário Fale conosco

De: ${data.name} <${data.email}>

Mensagem:
${data.message}

---
Caso queira adicionar algo à sua mensagem, basta responder este e-mail. Você recebeu uma cópia para referência.
${data.companyLine ?? ''}
  `.trim()

  return {
    html: renderEmailDocument({
      title: 'Fale conosco',
      brandName: data.brandName,
      body,
      footer,
    }),
    text,
  }
}
