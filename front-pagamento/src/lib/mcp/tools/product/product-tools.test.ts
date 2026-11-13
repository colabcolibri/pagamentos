import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const createProduct = vi.fn()
const updateProduct = vi.fn()
const createPrice = vi.fn()
const updatePrice = vi.fn()
const deleteProduct = vi.fn()
const getAllProducts = vi.fn()

vi.mock('@quitou/core/product-webhook', () => ({
  isPublicHttpsWebhookUrl: vi.fn(async (url: string) => url.startsWith('https://example.com/')),
}))

vi.mock('@/lib/payments/factories/service-factory', () => ({
  createAdminProductServices: () => ({
    productService: {
      createProduct,
      updateProduct,
      createPrice,
      updatePrice,
      deleteProduct,
      getAllProducts,
    },
  }),
}))

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}

const fullPolicy = {
  loadPolicy: async () => ({
    enabled: true,
    grants: { produto: ['read', 'upsert', 'delete'] as const },
  }),
  audit: vi.fn(),
}

describe('ferramentas de produto', () => {
  beforeEach(() => {
    createProduct.mockReset()
    updateProduct.mockReset()
    createPrice.mockReset()
    updatePrice.mockReset()
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

  it('produto_salvar aceita refund_policy, email_config, webhook_url pública e mascara webhook_secret', async () => {
    updateProduct.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Curso Completo',
      ref: 'curso-completo',
      webhook_secret: 'SECRET_webhook_1234',
    })
    const save = MCP_TOOLS.find((tool) => tool.name === 'produto_salvar')!
    const result = await executeTool(
      save,
      {
        id: '22222222-2222-4222-8222-222222222222',
        refund_policy: { title: 'Combinado de compra', summary: '7 dias' },
        email_config: { orderCreated: { subject: 'Pedido recebido' } },
        payment_methods: ['pix', 'credit_card'],
        webhook_url: 'https://example.com/webhook',
        webhook_secret: 'SECRET_webhook_1234',
        confirmar: true,
      },
      principal,
      fullPolicy
    )

    expect(result.isError).toBeUndefined()
    expect(updateProduct).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      expect.objectContaining({
        refund_policy: { title: 'Combinado de compra', summary: '7 dias' },
        email_config: { orderCreated: { subject: 'Pedido recebido' } },
        payment_methods: ['pix', 'credit_card'],
        webhook_url: 'https://example.com/webhook',
        webhook_secret: 'SECRET_webhook_1234',
      }),
      principal.id
    )
    expect(result.content[0]?.text).not.toContain('SECRET_webhook_1234')
  })

  it('produto_salvar bloqueia webhook_url privada ou HTTP (anti-SSRF)', async () => {
    const save = MCP_TOOLS.find((tool) => tool.name === 'produto_salvar')!
    const result = await executeTool(
      save,
      {
        id: '22222222-2222-4222-8222-222222222222',
        webhook_url: 'http://127.0.0.1:8080/hook',
        confirmar: true,
      },
      principal,
      fullPolicy
    )

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('HTTPS')
    expect(updateProduct).not.toHaveBeenCalled()
  })

  it('preco_salvar aceita recorrência, email_addon, promo_tiers, upgrades, add-ons e amount 0', async () => {
    updatePrice.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222', prices: [] })
    const savePrice = MCP_TOOLS.find((tool) => tool.name === 'preco_salvar')!
    const result = await executeTool(
      savePrice,
      {
        productId: '22222222-2222-4222-8222-222222222222',
        priceId: '33333333-3333-4333-8333-333333333333',
        amount: 0,
        recurring: true,
        interval: 'month',
        interval_count: 1,
        email_addon: { customNote: 'Acesso mensal' },
        stock_cap: 100,
        promo_tiers: [{ sort_order: 0, discount_percent: 20, applies_to: 'both' }],
        upgrade_to_price_ids: ['44444444-4444-4444-8444-444444444444'],
        addon_price_ids: ['55555555-5555-4555-8555-555555555555'],
        confirmar: true,
      },
      principal,
      fullPolicy
    )

    expect(result.isError).toBeUndefined()
    expect(updatePrice).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      expect.objectContaining({
        amount: 0,
        recurring: true,
        interval: 'month',
        interval_count: 1,
        email_addon: { customNote: 'Acesso mensal' },
        stock_cap: 100,
      }),
      principal.id
    )
  })
})
