import { describe, expect, it } from 'vitest'

import { sanitizeRefundPolicyHtml } from './sanitize-html'

describe('sanitizeRefundPolicyHtml', () => {
  it('permite HTML seguro: p, strong, a com href', () => {
    const html =
      '<p>Texto <strong>em negrito</strong>.</p><a href="https://example.com" target="_blank" rel="noopener">Link</a>'
    const out = sanitizeRefundPolicyHtml(html)
    expect(out).toContain('<p>')
    expect(out).toContain('<strong>')
    expect(out).toContain('</strong>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('Link')
  })

  it('remove ou escapa script (XSS)', () => {
    const html = '<p>Ok</p><script>alert("xss")</script>'
    const out = sanitizeRefundPolicyHtml(html)
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('alert("xss")')
    expect(out).toContain('<p>Ok</p>')
  })

  it('remove ou escapa onerror (XSS)', () => {
    const html = '<img src="x" onerror="alert(1)">'
    const out = sanitizeRefundPolicyHtml(html)
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert(1)')
  })

  it('remove ou escapa onload (XSS)', () => {
    const html = '<body onload="alert(1)">text</body>'
    const out = sanitizeRefundPolicyHtml(html)
    expect(out).not.toContain('onload')
    expect(out).not.toContain('alert(1)')
  })

  it('retorna string vazia para entrada não-string', () => {
    expect(sanitizeRefundPolicyHtml(null as unknown as string)).toBe('')
    expect(sanitizeRefundPolicyHtml(undefined as unknown as string)).toBe('')
  })

  it('permite ul, ol, li, br', () => {
    const html = '<ul><li>Item</li></ul><br/><ol><li>1</li></ol>'
    const out = sanitizeRefundPolicyHtml(html)
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>')
    expect(out).toContain('<br')
    expect(out).toContain('<ol>')
  })
})
