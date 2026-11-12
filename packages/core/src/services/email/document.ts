export const emailBrand = {
  primary: '#6467f2',
  foreground: '#0f1729',
  background: '#f9fafb',
  muted: '#65758b',
  border: '#dadfe7',
  card: '#f6f7f9',
  white: '#ffffff',
} as const

const AUTOMATIC_FOOTER = 'Este é um e-mail automático. Não responda esta mensagem.'

export function escapeEmailHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderEmailDocument(input: {
  title: string
  brandName: string
  body: string
  footer?: string
}): string {
  const footer = input.footer ?? `<p style="margin:0;font-size:12px;line-height:1.5;color:${emailBrand.muted};text-align:center;">${escapeEmailHtml(AUTOMATIC_FOOTER)}</p>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeEmailHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${emailBrand.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${emailBrand.foreground};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${emailBrand.background};padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${emailBrand.white};border-radius:8px;overflow:hidden;">
          <tr><td style="height:4px;background-color:${emailBrand.primary};"></td></tr>
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid ${emailBrand.border};">
              <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${escapeEmailHtml(input.brandName)}</p>
            </td>
          </tr>
          <tr><td style="padding:28px;">${input.body}</td></tr>
          <tr>
            <td style="padding:16px 28px;background-color:${emailBrand.card};border-top:1px solid ${emailBrand.border};">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
