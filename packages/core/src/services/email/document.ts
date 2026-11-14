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

export function buildEmailFooterHtml(input?: {
  footerText?: string | null
  companyLine?: string | null
}): string {
  const line1 = input?.footerText?.trim() || AUTOMATIC_FOOTER
  const line2 = input?.companyLine?.trim() || null
  const lines = [
    `<p style="margin:0;font-size:12px;line-height:1.5;color:${emailBrand.muted};text-align:center;">${escapeEmailHtml(line1)}</p>`,
  ]
  if (line2) {
    lines.push(
      `<p style="margin:6px 0 0;font-size:11px;line-height:1.4;color:${emailBrand.muted};text-align:center;">${escapeEmailHtml(line2)}</p>`
    )
  }
  return lines.join('\n')
}

export function buildEmailFooterText(input?: {
  footerText?: string | null
  companyLine?: string | null
}): string {
  const parts = [input?.footerText?.trim() || AUTOMATIC_FOOTER]
  if (input?.companyLine?.trim()) {
    parts.push(input.companyLine.trim())
  }
  return parts.join('\n')
}

export function renderEmailDocument(input: {
  title: string
  brandName: string
  brandLogoUrl?: string | null
  body: string
  footer?: string
  footerText?: string | null
  companyLine?: string | null
}): string {
  const footer =
    input.footer ??
    buildEmailFooterHtml({
      footerText: input.footerText,
      companyLine: input.companyLine,
    })

  const headerHtml = input.brandLogoUrl
    ? `<img src="${escapeEmailHtml(input.brandLogoUrl)}" alt="${escapeEmailHtml(input.brandName)}" style="max-height:36px;max-width:180px;width:auto;height:auto;display:block;border:0;" />`
    : `<p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${escapeEmailHtml(input.brandName)}</p>`

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
              ${headerHtml}
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
