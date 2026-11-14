import {
  buildEmailFooterText,
  emailBrand,
  escapeEmailHtml,
  renderEmailDocument,
} from '@quitou/core/email-document'

export function renderAccessCodeEmail(
  code: string,
  brandName: string,
  footer?: { footerText?: string | null; companyLine?: string | null }
): { html: string; text: string } {
  const digits = escapeEmailHtml(code.replace(/\D/g, '').slice(0, 6))

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Seu código de acesso</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${emailBrand.muted};">Digite estes 6 dígitos na tela. Não existe link de acesso.</p>
    <p style="margin:0 0 24px;font-size:32px;line-height:1.2;font-weight:700;font-family:'SF Mono',Menlo,Consolas,monospace;color:${emailBrand.foreground};">${digits}</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">O código vale por 10 minutos.</p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${emailBrand.muted};">Se você não pediu este acesso, ignore este e-mail.</p>
  `

  const footerTextBlock =
    footer?.footerText || footer?.companyLine ? ['', '--', buildEmailFooterText(footer)] : []

  const text = [
    brandName,
    '',
    'Seu código de acesso',
    code,
    '',
    'Digite estes 6 dígitos na tela. Não existe link de acesso.',
    'O código vale por 10 minutos.',
    'Se você não pediu este acesso, ignore este e-mail.',
    ...footerTextBlock,
  ].join('\n')

  return {
    html: renderEmailDocument({
      title: 'Seu código de acesso',
      brandName,
      body,
      footerText: footer?.footerText,
      companyLine: footer?.companyLine,
    }),
    text,
  }
}
