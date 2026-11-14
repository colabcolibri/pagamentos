/**
 * Utilitários de mascaramento de PII para logs de produção.
 */
export function maskDocument(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length <= 2) return '***'
  return `***${digits.slice(-2)}`
}

export function maskEmail(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return '***'
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  return `${local[0]}***@${domain}`
}
