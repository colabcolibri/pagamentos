import { describe, expect, it } from 'vitest'

import {
  buildPricePromoPublicDisplay,
  isPriceStockSoldOut,
  resolveActivePricePromo,
  tierMatchesCheckoutFlow,
  type PricePromoTierRow,
} from './price-promo'

describe('tierMatchesCheckoutFlow', () => {
  it('both casa com qualquer fluxo', () => {
    expect(tierMatchesCheckoutFlow({ applies_to: 'both' }, 'avista')).toBe(true)
    expect(tierMatchesCheckoutFlow({ applies_to: 'both' }, 'parcelado')).toBe(true)
  })
  it('filtra avista vs parcelado', () => {
    expect(tierMatchesCheckoutFlow({ applies_to: 'avista' }, 'avista')).toBe(true)
    expect(tierMatchesCheckoutFlow({ applies_to: 'avista' }, 'parcelado')).toBe(false)
    expect(tierMatchesCheckoutFlow({ applies_to: 'parcelado' }, 'parcelado')).toBe(true)
    expect(tierMatchesCheckoutFlow({ applies_to: 'parcelado' }, 'avista')).toBe(false)
  })
  it('ausente equivale a both', () => {
    expect(tierMatchesCheckoutFlow({}, 'parcelado')).toBe(true)
  })
})

describe('resolveActivePricePromo', () => {
  const base = 10000
  const tAv: PricePromoTierRow = {
    id: 'a',
    sort_order: 0,
    discount_percent: 20,
    ends_at: null,
    max_units: null,
    units_sold: 0,
    applies_to: 'avista',
  }

  it('sem faixas devolve lista cheia', () => {
    expect(resolveActivePricePromo(base, [], new Date('2025-06-01'), 'parcelado').promoListCents).toBe(
      base
    )
  })

  it('ignora faixa só avista no fluxo parcelado', () => {
    const tPar = { ...tAv, id: 'b', sort_order: 1, discount_percent: 30, applies_to: 'parcelado' as const }
    const r = resolveActivePricePromo(base, [tAv, tPar], new Date('2025-06-01'), 'parcelado')
    expect(r.tierId).toBe('b')
    expect(r.promoListCents).toBe(7000)
  })

  it('no avista usa faixa avista antes da parcelada', () => {
    const tPar = { ...tAv, id: 'b', sort_order: 1, discount_percent: 50, applies_to: 'parcelado' as const }
    const r = resolveActivePricePromo(base, [tPar, tAv], new Date('2025-06-01'), 'avista')
    expect(r.tierId).toBe('a')
    expect(r.promoListCents).toBe(8000)
  })

  it('ignora faixa expirada', () => {
    const expired = {
      ...tAv,
      id: 'x',
      ends_at: '2025-01-01T00:00:00.000Z',
      applies_to: 'both' as const,
    }
    const next = { ...tAv, id: 'y', sort_order: 1, discount_percent: 10, ends_at: null, applies_to: 'both' as const }
    const r = resolveActivePricePromo(base, [expired, next], new Date('2025-06-15T00:00:00.000Z'), 'avista')
    expect(r.tierId).toBe('y')
  })
})

describe('buildPricePromoPublicDisplay', () => {
  it('expõe avista e parcelado separados', () => {
    const ui = buildPricePromoPublicDisplay({
      amount: 10000,
      stock_cap: 5,
      stock_sold: 2,
      price_promo_tiers: [
        {
          id: '1',
          sort_order: 0,
          discount_percent: 10,
          ends_at: null,
          max_units: null,
          units_sold: 0,
          applies_to: 'avista',
        },
        {
          id: '2',
          sort_order: 1,
          discount_percent: 20,
          ends_at: null,
          max_units: null,
          units_sold: 0,
          applies_to: 'parcelado',
        },
      ],
    })
    expect(ui.avista.promoListCents).toBe(9000)
    expect(ui.parcelado.promoListCents).toBe(8000)
    expect(ui.stock.remaining).toBe(3)
    expect(ui.maxInstallments).toBe(1)
  })

  it('expõe maxInstallments a partir do metadata do preço', () => {
    const ui = buildPricePromoPublicDisplay({
      amount: 10_000,
      stock_cap: null,
      stock_sold: 0,
      maxInstallments: 3,
    })
    expect(ui.maxInstallments).toBe(3)
  })

  it('à vista aplica cash_discount depois do tier; parcelado não', () => {
    const ui = buildPricePromoPublicDisplay({
      amount: 100_000,
      stock_cap: null,
      stock_sold: 0,
      cashDiscountPercent: 5,
      price_promo_tiers: [
        {
          id: '1',
          sort_order: 0,
          discount_percent: 10,
          ends_at: null,
          max_units: null,
          units_sold: 0,
          applies_to: 'both',
        },
      ],
    })
    // 10% tier → 90_000 (afterTier); 5% cash sobre afterTier (90_000) → 4_500 → 85_500
    expect(ui.avista.promoListCents).toBe(85_500)
    expect(ui.avista.afterPromoTierCents).toBe(90_000)
    expect(ui.avista.discountPercent).toBe(10)
    expect(ui.avista.cashDiscountPercent).toBe(5)
    expect(ui.parcelado.promoListCents).toBe(90_000)
    expect(ui.parcelado.cashDiscountPercent).toBeUndefined()
    expect(ui.maxInstallments).toBe(1)
  })
})

describe('isPriceStockSoldOut', () => {
  it('sem cap nunca esgota', () => {
    expect(isPriceStockSoldOut({ stock_cap: null, stock_sold: 999 })).toBe(false)
  })
  it('esgotado quando sold >= cap', () => {
    expect(isPriceStockSoldOut({ stock_cap: 10, stock_sold: 10 })).toBe(true)
  })
})
