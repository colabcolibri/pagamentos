import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const { createProductWithPrices, geminiChat, loadGatewayConfig } = vi.hoisted(() => ({
  createProductWithPrices: vi.fn(),
  geminiChat: vi.fn(),
  loadGatewayConfig: vi.fn(),
}))

vi.mock('@/lib/payments/gateway-config', () => ({
  loadGatewayConfig,
  maskSecret: (value: string | null) => value,
  toAdminGatewayView: vi.fn(),
}))
vi.mock('@/lib/ai/gemini', () => ({ geminiChat }))
vi.mock('@/lib/payments/factories/service-factory', () => ({
  createAdminProductServices: () => ({ productService: { createProductWithPrices } }),
}))

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}
const deps = {
  loadPolicy: async () => ({ enabled: true, grants: { ia: ['upsert'] as const } }),
  audit: vi.fn(),
}

describe('ferramentas de IA', () => {
  beforeEach(() => {
    createProductWithPrices.mockReset()
    geminiChat.mockReset()
    loadGatewayConfig.mockReset()
  })

  it('sem chave não grava e não devolve segredo', async () => {
    loadGatewayConfig.mockResolvedValue({ geminiApiKey: null })
    const tool = MCP_TOOLS.find((item) => item.name === 'produto_gerar')!
    const result = await executeTool(
      tool,
      {
        texto: 'um texto longo o bastante para gerar um rascunho de produto digital',
        confirmar: true,
      },
      principal,
      deps
    )
    expect(result.isError).toBeUndefined()
    expect(result.content[0]?.text).toContain('Gemini não configurado')
    expect(result.content[0]?.text).not.toContain('SECRET_')
    expect(createProductWithPrices).not.toHaveBeenCalled()
    expect(geminiChat).not.toHaveBeenCalled()
  })

  it('dry_run devolve o rascunho e não grava', async () => {
    loadGatewayConfig.mockResolvedValue({ geminiApiKey: 'SECRET_gemini' })
    geminiChat.mockResolvedValue({
      text: JSON.stringify({
        product: { name: 'Curso', ref: 'curso', description: null, active: false },
        prices: [{ ref: 'avista', amount: 1000, currency: 'BRL', recurring: false, active: true }],
      }),
    })
    const tool = MCP_TOOLS.find((item) => item.name === 'produto_gerar')!
    const result = await executeTool(
      tool,
      {
        texto: 'um texto longo o bastante para gerar um rascunho de produto digital',
        dry_run: true,
      },
      principal,
      deps
    )
    expect(result.content[0]?.text).toContain('Curso')
    expect(result.content[0]?.text).not.toContain('SECRET_gemini')
    expect(createProductWithPrices).not.toHaveBeenCalled()
  })

  it('recusa gravar produto no banco se produto:upsert estiver desligado na política', async () => {
    loadGatewayConfig.mockResolvedValue({ geminiApiKey: 'SECRET_gemini' })
    geminiChat.mockResolvedValue({
      text: JSON.stringify({
        product: { name: 'Curso', ref: 'curso', description: null, active: false },
        prices: [{ ref: 'avista', amount: 1000, currency: 'BRL', recurring: false, active: true }],
      }),
    })
    const tool = MCP_TOOLS.find((item) => item.name === 'produto_gerar')!
    const result = await executeTool(
      tool,
      {
        texto: 'um texto longo o bastante para gerar um rascunho de produto digital',
        confirmar: true,
      },
      principal,
      deps
    )
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('produto')
    expect(createProductWithPrices).not.toHaveBeenCalled()
  })
})
