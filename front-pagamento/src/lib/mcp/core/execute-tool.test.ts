import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { executeTool } from './execute-tool'
import type { McpTool } from './types'

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}

function tool(overrides: Partial<McpTool> = {}): McpTool {
  return {
    name: 'produto_salvar',
    title: 'Salvar produto',
    description: 'Grava produto',
    policyKey: 'produto',
    action: 'upsert',
    risk: 'alto',
    input: z.object({ name: z.string() }),
    parameters: { type: 'object' },
    handler: vi.fn(async () => ({ ok: true })),
    ...overrides,
  }
}

describe('executeTool', () => {
  it('não chama o handler quando a política nega e ainda audita', async () => {
    const handler = vi.fn()
    const audit = vi.fn()
    const result = await executeTool(tool({ handler }), { name: 'A' }, principal, {
      loadPolicy: async () => ({ enabled: false, grants: {} }),
      audit,
    })
    expect(handler).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'negado' }))
    expect(JSON.stringify(result)).not.toContain('SECRET_')
  })

  it('não chama o handler com argumento inválido', async () => {
    const handler = vi.fn()
    const audit = vi.fn()
    await executeTool(tool({ handler }), { confirmar: true }, principal, {
      loadPolicy: async () => ({ enabled: true, grants: { produto: ['upsert'] as const } }),
      audit,
    })
    expect(handler).not.toHaveBeenCalled()
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'erro' }))
  })

  it('exige confirmação no risco alto e simula no dry_run sem gravar de verdade', async () => {
    const handler = vi.fn(async (_args, ctx: { dryRun: boolean }) => ({ dryRun: ctx.dryRun }))
    const audit = vi.fn()
    const deps = {
      loadPolicy: async () => ({ enabled: true, grants: { produto: ['upsert'] as const } }),
      audit,
    }
    const denied = await executeTool(tool({ handler }), { name: 'A' }, principal, deps)
    expect(denied.isError).toBe(true)
    expect(handler).not.toHaveBeenCalled()

    const simulated = await executeTool(
      tool({ handler }),
      { name: 'A', dry_run: true },
      principal,
      deps
    )
    expect(simulated.isError).toBeUndefined()
    expect(handler).toHaveBeenCalledWith({ name: 'A' }, expect.objectContaining({ dryRun: true }))
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'simulado' }))
  })
})
