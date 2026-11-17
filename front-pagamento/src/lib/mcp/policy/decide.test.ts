import { describe, expect, it } from 'vitest'

import { cascadeModuleActions, decideAccess, filterAllowed } from './decide'

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

  it('é escalonado: gravar libera ler, e apagar libera ler e gravar', () => {
    const readTool = { name: 'produto_listar', policyKey: 'produto', action: 'read' as const }
    const upsertTool = { name: 'produto_salvar', policyKey: 'produto', action: 'upsert' as const }
    expect(decideAccess(readTool, { enabled: true, grants: { produto: ['upsert'] } })).toEqual({
      allowed: true,
    })
    expect(decideAccess(readTool, { enabled: true, grants: { produto: ['delete'] } })).toEqual({
      allowed: true,
    })
    expect(decideAccess(upsertTool, { enabled: true, grants: { produto: ['delete'] } })).toEqual({
      allowed: true,
    })
  })
})

describe('cascadeModuleActions', () => {
  it('ao ligar nível maior libera os anteriores e ao desligar nível menor revoga os maiores', () => {
    expect(
      cascadeModuleActions({ read: false, upsert: false, delete: false }, 'upsert', true)
    ).toEqual({ read: true, upsert: true, delete: false })

    expect(
      cascadeModuleActions({ read: false, upsert: false, delete: false }, 'delete', true)
    ).toEqual({ read: true, upsert: true, delete: true })

    expect(
      cascadeModuleActions({ read: true, upsert: true, delete: true }, 'upsert', false)
    ).toEqual({ read: true, upsert: false, delete: false })

    expect(cascadeModuleActions({ read: true, upsert: true, delete: true }, 'read', false)).toEqual(
      { read: false, upsert: false, delete: false }
    )
  })
})
