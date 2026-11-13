import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeTool } from '../../core/execute-tool'
import { MCP_TOOLS } from '../catalog'

const { assertCouponPriceScope, getAdminCoupon, insertAdminCoupon, syncCouponLinks } = vi.hoisted(
  () => ({
    assertCouponPriceScope: vi.fn(),
    getAdminCoupon: vi.fn(),
    insertAdminCoupon: vi.fn(),
    syncCouponLinks: vi.fn(),
  })
)

vi.mock('@/lib/payments/admin-coupon-store', () => ({
  assertCouponPriceScope,
  deleteAdminCoupon: vi.fn(),
  getAdminCoupon,
  insertAdminCoupon,
  listAdminCoupons: vi.fn(),
  syncCouponLinks,
  updateAdminCoupon: vi.fn(),
}))

const principal = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@quitou.local',
  clientId: 'c1',
}

const deps = {
  loadPolicy: async () => ({
    enabled: true,
    grants: { cupom: ['read', 'upsert', 'delete'] as const },
  }),
  audit: vi.fn(),
}

describe('ferramentas de cupom', () => {
  beforeEach(() => {
    assertCouponPriceScope.mockReset()
    getAdminCoupon.mockReset()
    insertAdminCoupon.mockReset()
    syncCouponLinks.mockReset()
  })

  it('cupom_salvar cria cupom fixed_cents com vínculos de produto/preço e textos públicos', async () => {
    assertCouponPriceScope.mockResolvedValue({ ok: true })
    insertAdminCoupon.mockResolvedValue({ id: '99999999-9999-4999-8999-999999999999' })
    syncCouponLinks.mockResolvedValue(undefined)
    getAdminCoupon.mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      code: 'PROMO50',
      discount_type: 'fixed_cents',
      discount_amount_cents: 5000,
    })

    const save = MCP_TOOLS.find((tool) => tool.name === 'cupom_salvar')!
    const result = await executeTool(
      save,
      {
        code: 'promo50',
        discount_type: 'fixed_cents',
        discount_amount_cents: 5000,
        applies_to: 'both',
        product_ids: ['22222222-2222-4222-8222-222222222222'],
        price_ids: ['33333333-3333-4333-8333-333333333333'],
        max_redemptions_total: 100,
        active: true,
        public_show_remaining: true,
        public_remaining_prefix: 'Restam ',
        confirmar: true,
      },
      principal,
      deps
    )

    expect(result.isError).toBeUndefined()
    expect(assertCouponPriceScope).toHaveBeenCalledWith(
      ['33333333-3333-4333-8333-333333333333'],
      ['22222222-2222-4222-8222-222222222222']
    )
    expect(insertAdminCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PROMO50',
        discount_type: 'fixed_cents',
        discount_amount_cents: 5000,
        max_redemptions_total: 100,
        public_show_remaining: true,
      })
    )
    expect(syncCouponLinks).toHaveBeenCalledWith(
      '99999999-9999-4999-8999-999999999999',
      ['22222222-2222-4222-8222-222222222222'],
      ['33333333-3333-4333-8333-333333333333']
    )
  })
})
