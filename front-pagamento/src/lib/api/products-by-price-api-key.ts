import { timingSafeStringEqual } from '@/lib/security/timing-safe-string-equal'

function bearerToken(authorization: string | null): string | null {
  if (!authorization?.toLowerCase().startsWith('bearer ')) return null
  const t = authorization.slice(7).trim()
  return t || null
}

/**
 * Se a chave estiver definida (ambiente ou configurações), a requisição precisa de
 * `x-api-key: <valor>` ou `Authorization: Bearer <valor>`.
 * Sem chave, retorna true (compatível com o comportamento anterior).
 */
export function isProductsByPriceApiKeyValid(request: Request, secret: string | null): boolean {
  const expected = secret?.trim()
  if (!expected) return true

  const fromHeader = request.headers.get('x-api-key')?.trim()
  const fromBearer = bearerToken(request.headers.get('authorization'))
  const presented = fromHeader || fromBearer
  if (!presented) return false
  return timingSafeStringEqual(presented, expected)
}
