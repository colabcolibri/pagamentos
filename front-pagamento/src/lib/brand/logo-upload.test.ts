import { describe, expect, it } from 'vitest'

import { sanitizeSvg, validateAndNormalizeLogo } from './logo-upload'

describe('logo-upload', () => {
  it('remove scripts e handlers XSS de SVG', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10" onclick="x()" /></svg>'
    const clean = sanitizeSvg(dirty)
    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('onload=')
    expect(clean).not.toContain('onclick=')
    expect(clean).toContain('<rect')
  })

  it('valida e normaliza SVG em base64', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" /></svg>'
    const res = validateAndNormalizeLogo({
      mime: 'image/svg+xml',
      base64: Buffer.from(svg, 'utf8').toString('base64'),
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.mime).toBe('image/svg+xml')
      expect(Buffer.from(res.base64, 'base64').toString('utf8')).toContain('<circle')
    }
  })

  it('rejeita formato não permitido', () => {
    const res = validateAndNormalizeLogo({
      mime: 'text/html',
      base64: Buffer.from('<html></html>').toString('base64'),
    })
    expect(res.ok).toBe(false)
  })
})
