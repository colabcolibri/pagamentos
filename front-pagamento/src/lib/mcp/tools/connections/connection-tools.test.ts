import { describe, expect, it } from 'vitest'

import { redactConnectionMessage } from '@/lib/admin/connection-tests'

import { MCP_TOOLS } from '../catalog'

describe('teste de conexão', () => {
  it('tira a chave da mensagem e não oferece escrita', () => {
    const message = redactConnectionMessage(
      'GET https://example.test/models?key=SECRET_gemini falhou Bearer abc.def'
    )
    expect(message).not.toContain('SECRET_')
    expect(message).not.toContain('abc.def')
    expect(message).toContain('key=***')
    expect(MCP_TOOLS.find((tool) => tool.name === 'conexao_testar')?.action).toBe('read')
  })
})
