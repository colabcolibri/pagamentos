import { describe, expect, it } from 'vitest'

import { safeMcpReturnPath } from './safe-return-path'

describe('safeMcpReturnPath', () => {
  it('aceita o consentimento do MCP', () => {
    expect(safeMcpReturnPath('/admin/mcp/consent?client_id=abc')).toBe(
      '/admin/mcp/consent?client_id=abc'
    )
  })

  it('recusa endereço externo', () => {
    expect(safeMcpReturnPath('https://evil.example/admin/mcp/consent')).toBeNull()
    expect(safeMcpReturnPath('//evil.example/admin/mcp/consent')).toBeNull()
    expect(safeMcpReturnPath('/admin')).toBeNull()
  })
})
