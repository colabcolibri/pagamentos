import { describe, expect, it } from 'vitest'

import { decideAccess, filterAllowed } from './decide'

const tool = { name: 'produto_salvar', policyKey: 'produto', action: 'upsert' as const }

describe('decideAccess', () => {
  it('nega quando o MCP está desligado', () => {
    expect(decideAccess(tool, { enabled: false, grants: { produto: ['upsert'] } })).toEqual({
      allowed: false,
      reason: 'mcp_desligado',
    })
  })

  it('nega ação ausente', () => {
    expect(decideAccess(tool, { enabled: true, grants: { produto: ['read'] } })).toEqual({
      allowed: false,
      reason: 'acao_desligada',
    })
  })

  it('permite quando a ação está ligada', () => {
    expect(decideAccess(tool, { enabled: true, grants: { produto: ['upsert'] } })).toEqual({
      allowed: true,
    })
  })

  it('lista só o que a política deixa', () => {
    const tools = [
      { name: 'a', policyKey: 'produto', action: 'read' as const },
      { name: 'b', policyKey: 'produto', action: 'delete' as const },
    ]
    expect(
      filterAllowed(tools, { enabled: true, grants: { produto: ['read'] } }).map((t) => t.name)
    ).toEqual(['a'])
  })
})
