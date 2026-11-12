import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const deleteProduct = vi.fn()
const getAllProducts = vi.fn()

vi.mock('@/lib/payments/factories/service-factory', () => ({
  createAdminProductServices: () => ({
    productService: { deleteProduct, getAllProducts },
  }),
}))

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}

describe('ferramentas de produto', () => {
  beforeEach(() => {
    deleteProduct.mockReset()
    getAllProducts.mockReset()
  })

  it('não apaga quando delete está desligado e mascara o segredo', async () => {
    getAllProducts.mockResolvedValue([{ id: 'p1', name: 'Curso', webhook_secret: 'SECRET_abcdef' }])
    const list = MCP_TOOLS.find((tool) => tool.name === 'produto_listar')!
    const listed = await executeTool(list, {}, principal, {
      loadPolicy: async () => ({ enabled: true, grants: { produto: ['read'] } }),
      audit: vi.fn(),
    })
    expect(listed.content[0]?.text).not.toContain('SECRET_abcdef')
    expect(listed.content[0]?.text).toContain('SEC')

    const remove = MCP_TOOLS.find((tool) => tool.name === 'produto_apagar')!
    await executeTool(
      remove,
      { id: '11111111-1111-1111-1111-111111111111', confirmar: true },
      principal,
      {
        loadPolicy: async () => ({ enabled: true, grants: { produto: ['read'] } }),
        audit: vi.fn(),
      }
    )
    expect(deleteProduct).not.toHaveBeenCalled()
  })
})
