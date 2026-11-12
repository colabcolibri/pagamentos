const ALLOWED = ['/admin/mcp/consent', '/api/mcp/oauth/authorize']

export function safeMcpReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return null
  const path = value.split('?')[0]
  if (!ALLOWED.includes(path)) return null
  return value
}
