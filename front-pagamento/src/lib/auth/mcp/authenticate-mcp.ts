import { principalFromAccessToken } from '@/lib/mcp/auth/oauth-store'

export function readBearer(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export async function authenticateMcpBearer(header: string | null) {
  const token = readBearer(header)
  if (!token) return null
  return principalFromAccessToken(token)
}
