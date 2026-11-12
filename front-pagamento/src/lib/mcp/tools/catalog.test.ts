import { describe, expect, it } from 'vitest'

import { MCP_TOOLS } from './catalog'

const READ_ONLY = new Set(['identidade', 'assinatura', 'webhook', 'auditoria', 'conexao', 'resumo'])

describe('MCP_TOOLS', () => {
  it('não repete nome e não oferece delete onde a tela não apaga', () => {
    const names = MCP_TOOLS.map((tool) => tool.name)
    expect(new Set(names).size).toBe(names.length)
    for (const tool of MCP_TOOLS) {
      if (READ_ONLY.has(tool.policyKey)) expect(tool.action).toBe('read')
      if (tool.action === 'delete') expect(tool.risk).toBe('alto')
    }
    expect(names).not.toContain('pagamento_apagar')
    expect(names).not.toContain('assinatura_cancelar')
  })
})
