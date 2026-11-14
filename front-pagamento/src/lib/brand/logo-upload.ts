import crypto from 'node:crypto'

export const ALLOWED_LOGO_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])

export const MAX_LOGO_BYTES = 512 * 1024 // 512 KB

export function sanitizeSvg(rawSvg: string): string {
  return rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

export function validateAndNormalizeLogo(input: {
  mime: string
  base64: string
}): { ok: true; mime: string; base64: string } | { ok: false; message: string } {
  const mime = input.mime.trim().toLowerCase()
  if (!ALLOWED_LOGO_MIMES.has(mime)) {
    return {
      ok: false,
      message: 'Formato de logo inválido. Use PNG, JPG, WebP ou SVG.',
    }
  }

  const rawBase64 = input.base64.replace(/^data:[^;]+;base64,/, '').trim()
  if (!rawBase64) {
    return { ok: false, message: 'Arquivo de logo vazio.' }
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(rawBase64, 'base64')
  } catch {
    return { ok: false, message: 'Conteúdo da logo inválido.' }
  }

  if (buffer.length === 0 || buffer.length > MAX_LOGO_BYTES) {
    return {
      ok: false,
      message: 'Logo deve ter entre 1 byte e 512 KB.',
    }
  }

  if (mime === 'image/svg+xml') {
    const text = buffer.toString('utf8')
    if (!/<svg[\s>]/i.test(text)) {
      return { ok: false, message: 'Arquivo SVG inválido.' }
    }
    const clean = sanitizeSvg(text)
    return {
      ok: true,
      mime,
      base64: Buffer.from(clean, 'utf8').toString('base64'),
    }
  }

  return {
    ok: true,
    mime,
    base64: buffer.toString('base64'),
  }
}

export function computeLogoVersion(base64: string | null | undefined): string | null {
  if (!base64) return null
  return crypto.createHash('sha256').update(base64).digest('hex').slice(0, 12)
}
