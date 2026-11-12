import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'br', 'a', 'span']
const ALLOWED_ATTR = ['href', 'target', 'rel']

/**
 * Sanitiza HTML para exibição segura (ex.: política de reembolso).
 * Permite apenas tags de formatação e links; remove script e eventos.
 */
export function sanitizeRefundPolicyHtml(html: string): string {
  if (typeof html !== 'string') return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target', 'rel'],
  })
}
