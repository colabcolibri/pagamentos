import { describe, expect, it } from 'vitest'

import { buildPagarmeLineTotals } from './checkout-pricing'

describe('buildPagarmeLineTotals', () => {
  it('mantém cartAmountCents <= todas as parcelas quando há cupom de desconto', () => {
    const res = buildPagarmeLineTotals(79900, 0, {
      discount_type: 'fixed',
      discount_percent: null,
      discount_amount_cents: 79400,
      applies_to: 'both',
    })
    expect(res.installmentOneTotal).toBe(500)
    expect(res.installmentMultiTotal).toBe(500)
    expect(res.cartAmountCents).toBe(500)
    expect(res.pixBoletoDiscountPercent).toBeNull()
  })

  it('mantém cartAmountCents alinhado com à vista quando há cashDiscount', () => {
    const res = buildPagarmeLineTotals(79900, 10, null)
    expect(res.installmentOneTotal).toBe(71910)
    expect(res.installmentMultiTotal).toBe(79900)
    expect(res.cartAmountCents).toBe(71910)
    expect(res.cartAmountCents).toBeLessThanOrEqual(res.installmentOneTotal)
    expect(res.cartAmountCents).toBeLessThanOrEqual(res.installmentMultiTotal)
    expect(res.pixBoletoDiscountPercent).toBeNull()
  })
})
