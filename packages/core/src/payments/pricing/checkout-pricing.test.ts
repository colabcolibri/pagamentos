import { describe, expect, it } from 'vitest'

import {
  applyCouponDiscountToBase,
  cashBaseCentsFromList,
  parseMaxInstallmentsFromMetadata,
  subtotalCentsForFlow,
} from './checkout-pricing'

describe('checkout-pricing', () => {
  it('cashBaseCentsFromList aplica percentual à vista do preço', () => {
    expect(cashBaseCentsFromList(10_000, 10)).toBe(9000)
  })

  it('subtotal parcelado ignora desconto à vista', () => {
    expect(subtotalCentsForFlow(10_000, 10, 'parcelado')).toBe(10_000)
  })

  it('subtotal à vista retorna lista sem cash (cupom aplica antes do desconto à vista)', () => {
    expect(subtotalCentsForFlow(10_000, 10, 'avista')).toBe(10_000)
  })

  it('cupom percentual reduz a base', () => {
    const { discountCents, finalCents } = applyCouponDiscountToBase(9000, {
      discount_type: 'percent',
      discount_percent: 20,
      discount_amount_cents: null,
    })
    expect(discountCents).toBe(1800)
    expect(finalCents).toBe(7200)
  })

  it('cupom fixo respeita teto da base e mínimo 1 centavo', () => {
    const { finalCents } = applyCouponDiscountToBase(500, {
      discount_type: 'fixed_cents',
      discount_percent: null,
      discount_amount_cents: 10_000,
    })
    expect(finalCents).toBe(1)
  })

  it('parseMaxInstallmentsFromMetadata lê número e string', () => {
    expect(parseMaxInstallmentsFromMetadata({ max_installments: 3 })).toBe(3)
    expect(parseMaxInstallmentsFromMetadata({ max_installments: '12' })).toBe(12)
    expect(parseMaxInstallmentsFromMetadata({})).toBe(1)
    expect(parseMaxInstallmentsFromMetadata({ max_installments: 99 })).toBe(48)
  })
})
