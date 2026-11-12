import { emailBrand, escapeEmailHtml, renderEmailDocument } from '@quitou/core/email-document'

export function renderAccessCodeEmail(
  code: string,
  brandName: string
): { html: string; text: string } {
  const digits = code
    .replace(/\D/g, '')
    .slice(0, 6)
    .split('')
    .map(
      (digit) =>
        `<td style="width:44px;height:52px;border:1px solid ${emailBrand.border};border-radius:8px;background-color:${emailBrand.card};text-align:center;font-size:24px;font-weight:700;font-family:'SF Mono',Menlo,Consolas,monospace;color:${emailBrand.foreground};">${escapeEmailHtml(digit)}</td>`
    )
    .join('<td style="width:8px;"></td>')

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Seu código de acesso</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${emailBrand.muted};">Digite estes 6 dígitos na tela. Não existe link de acesso.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>${digits}</tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">O código vale por 10 minutos.</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${emailBrand.muted};">Se você não pediu este acesso, ignore este e-mail.</p>
  `

  const text = [
    brandName,
    '',
    'Seu código de acesso',
    code,
    '',
    'Digite estes 6 dígitos na tela. Não existe link de acesso.',
    'O código vale por 10 minutos.',
    'Se você não pediu este acesso, ignore este e-mail.',
  ].join('\n')

  return {
    html: renderEmailDocument({ title: 'Seu código de acesso', brandName, body }),
    text,
  }
}
