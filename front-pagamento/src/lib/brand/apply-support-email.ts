export const SUPPORT_EMAIL_TOKEN = '{{support_email}}'
export const SUPPORT_EMAIL_FALLBACK = 'e-mail de suporte da loja'

export function applySupportEmail(value: string, supportEmail: string | null | undefined): string {
  const replacement = supportEmail?.trim() || SUPPORT_EMAIL_FALLBACK
  return value.replaceAll(SUPPORT_EMAIL_TOKEN, replacement)
}

export function applySupportEmailDeep<T>(value: T, supportEmail: string | null | undefined): T {
  if (typeof value === 'string') return applySupportEmail(value, supportEmail) as T
  if (Array.isArray(value)) {
    return value.map((item) => applySupportEmailDeep(item, supportEmail)) as T
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      next[key] = applySupportEmailDeep(item, supportEmail)
    }
    return next as T
  }
  return value
}
