import { describe, expect, it } from 'vitest'

import {
  buildCouponPublicLines,
  couponAllowsPriceId,
  couponAllowsProductId,
  indexOfActivePublicMessageBand,
  joinCouponPublicAffixes,
  resolveActivePublicMessageBand,
  type DiscountCouponRow,
  type DiscountCouponRowWithScope,
} from './discount-coupon.service'

function baseCoupon(over: Partial<DiscountCouponRow> = {}): DiscountCouponRow {
  return {
    id: 'c1',
    code: 'X',
    discount_type: 'percent',
    discount_percent: '10',
    discount_amount_cents: null,
    applies_to: 'both',
    product_id: null,
    price_id: null,
    max_redemptions_total: 100,
    max_redemptions_per_user: null,
    starts_at: null,
    ends_at: '2030-06-01T15:00:00.000Z',
    active: true,
    public_show_remaining: true,
    public_remaining_prefix: 'Padrão ',
    public_remaining_suffix: ' fim',
    public_show_valid_until: true,
    public_valid_until_prefix: 'Até ',
    public_valid_until_suffix: '.',
    public_message_bands: [],
    ...over,
  }
}

describe('couponAllowsProductId', () => {
  it('permite qualquer produto quando não há restrição', () => {
    expect(couponAllowsProductId(baseCoupon(), 'qualquer-uuid')).toBe(true)
  })

  it('respeita product_id legado', () => {
    expect(couponAllowsProductId(baseCoupon({ product_id: 'p1' }), 'p1')).toBe(true)
    expect(couponAllowsProductId(baseCoupon({ product_id: 'p1' }), 'p2')).toBe(false)
  })

  it('aceita o produto se estiver na tabela de junção', () => {
    const c: DiscountCouponRowWithScope = {
      ...baseCoupon({ product_id: null }),
      discount_coupon_products: [{ product_id: 'a' }, { product_id: 'b' }],
    }
    expect(couponAllowsProductId(c, 'a')).toBe(true)
    expect(couponAllowsProductId(c, 'b')).toBe(true)
    expect(couponAllowsProductId(c, 'c')).toBe(false)
  })

  it('une junção e coluna legada', () => {
    const c: DiscountCouponRowWithScope = {
      ...baseCoupon({ product_id: 'p1' }),
      discount_coupon_products: [{ product_id: 'p2' }],
    }
    expect(couponAllowsProductId(c, 'p1')).toBe(true)
    expect(couponAllowsProductId(c, 'p2')).toBe(true)
  })
})

describe('couponAllowsPriceId', () => {
  it('permite qualquer preço quando não há restrição', () => {
    expect(couponAllowsPriceId(baseCoupon(), 'qualquer')).toBe(true)
  })

  it('respeita price_id legado', () => {
    expect(couponAllowsPriceId(baseCoupon({ price_id: 'pr1' }), 'pr1')).toBe(true)
    expect(couponAllowsPriceId(baseCoupon({ price_id: 'pr1' }), 'pr2')).toBe(false)
  })

  it('aceita preço na junção', () => {
    const c: DiscountCouponRowWithScope = {
      ...baseCoupon({ price_id: null }),
      discount_coupon_prices: [{ price_id: 'a' }, { price_id: 'b' }],
    }
    expect(couponAllowsPriceId(c, 'a')).toBe(true)
    expect(couponAllowsPriceId(c, 'b')).toBe(true)
    expect(couponAllowsPriceId(c, 'c')).toBe(false)
  })

  it('une junção e coluna legada', () => {
    const c: DiscountCouponRowWithScope = {
      ...baseCoupon({ price_id: 'pr1' }),
      discount_coupon_prices: [{ price_id: 'pr2' }],
    }
    expect(couponAllowsPriceId(c, 'pr1')).toBe(true)
    expect(couponAllowsPriceId(c, 'pr2')).toBe(true)
  })
})

describe('joinCouponPublicAffixes', () => {
  it('insere espaço entre prefixo sem espaço e número', () => {
    expect(joinCouponPublicAffixes('Temos', 5, 'cupons')).toBe('Temos 5 cupons')
  })

  it('não duplica espaço se o prefixo já termina com espaço', () => {
    expect(joinCouponPublicAffixes('Temos ', 5, 'cupons')).toBe('Temos 5 cupons')
  })

  it('não duplica espaço antes de sufixo que já começa com espaço', () => {
    expect(joinCouponPublicAffixes('X', 1, ' resto')).toBe('X 1 resto')
  })

  it('cola sufixo pontuação sem espaço extra antes do ponto', () => {
    expect(joinCouponPublicAffixes('N', 3, '.')).toBe('N 3.')
  })
})

describe('resolveActivePublicMessageBand', () => {
  const bands = [
    {
      remaining_min: 20,
      remaining_max: 100,
      remaining_prefix: 'muitos',
    },
    {
      remaining_min: 1,
      remaining_max: 19,
      remaining_prefix: 'poucos',
    },
    {
      remaining_min: 0,
      remaining_max: 0,
      remaining_prefix: 'esgotado',
    },
  ]

  it('retorna null quando a lista é vazia, inválida ou sem limite total (remainingLeft null)', () => {
    expect(resolveActivePublicMessageBand([], 10)).toBeNull()
    expect(resolveActivePublicMessageBand(null, 10)).toBeNull()
    expect(resolveActivePublicMessageBand({}, 10)).toBeNull()
    expect(resolveActivePublicMessageBand(bands, null)).toBeNull()
  })

  it('retorna null fora de qualquer faixa', () => {
    expect(resolveActivePublicMessageBand(bands, 101)).toBeNull()
  })

  it('respeita mínimo e máximo (intervalo fechado)', () => {
    expect(resolveActivePublicMessageBand(bands, 50)?.remaining_prefix).toBe('muitos')
    expect(resolveActivePublicMessageBand(bands, 20)?.remaining_prefix).toBe('muitos')
    expect(resolveActivePublicMessageBand(bands, 19)?.remaining_prefix).toBe('poucos')
    expect(resolveActivePublicMessageBand(bands, 1)?.remaining_prefix).toBe('poucos')
  })

  it('remaining_max null significa sem teto superior', () => {
    const open = [{ remaining_min: 50, remaining_max: null, remaining_prefix: 'alto' }]
    expect(resolveActivePublicMessageBand(open, 9999)?.remaining_prefix).toBe('alto')
    expect(resolveActivePublicMessageBand(open, 49)).toBeNull()
  })

  it('primeira faixa na ordem do array que cobre o restante vence', () => {
    const overlap = [
      { remaining_min: 1, remaining_max: 100, remaining_prefix: 'primeira' },
      { remaining_min: 1, remaining_max: 100, remaining_prefix: 'segunda' },
    ]
    expect(resolveActivePublicMessageBand(overlap, 10)?.remaining_prefix).toBe('primeira')
  })

  it('ignora entradas sem remaining_min válido', () => {
    expect(resolveActivePublicMessageBand([{ remaining_prefix: 'x' }], 5)).toBeNull()
  })
})

describe('indexOfActivePublicMessageBand', () => {
  const bands = [
    { remaining_min: 20, remaining_max: 100, remaining_prefix: 'a' },
    { remaining_min: 1, remaining_max: 19, remaining_prefix: 'b' },
  ]

  it('alinha com resolveActivePublicMessageBand', () => {
    const left = 15
    const i = indexOfActivePublicMessageBand(bands, left)
    expect(i).toBe(1)
    expect(resolveActivePublicMessageBand(bands, left)?.remaining_prefix).toBe('b')
  })

  it('retorna null quando não há faixa', () => {
    expect(indexOfActivePublicMessageBand(bands, 200)).toBeNull()
  })

  it('primeiro índice quando a primeira faixa cobre', () => {
    expect(indexOfActivePublicMessageBand(bands, 50)).toBe(0)
  })
})

describe('buildCouponPublicLines', () => {
  it('não monta linhas quando os flags estão desligados', () => {
    const c = baseCoupon({
      public_show_remaining: false,
      public_show_valid_until: false,
    })
    const r = buildCouponPublicLines(c, 0)
    expect(r.remaining).toBeNull()
    expect(r.validUntil).toBeNull()
  })

  it('usa prefixos/sufixos padrão do cupom sem faixa', () => {
    const c = baseCoupon()
    const r = buildCouponPublicLines(c, 88)
    expect(r.remaining).toBe('Padrão 12 fim')
    expect(r.validUntil).toBeTruthy()
  })

  it('sobrescreve só os campos preenchidos na faixa ativa', () => {
    const c = baseCoupon({
      public_message_bands: [
        {
          remaining_min: 1,
          remaining_max: 50,
          remaining_prefix: 'Campanha ',
        },
      ],
    })
    const r = buildCouponPublicLines(c, 88)
    expect(r.remaining).toBe('Campanha 12 fim')
    expect(r.validUntil).toBeTruthy()
  })

  it('fora de qualquer faixa volta ao padrão do cupom', () => {
    const c = baseCoupon({
      public_message_bands: [
        {
          remaining_min: 1,
          remaining_max: 5,
          remaining_prefix: 'Últimas ',
        },
      ],
    })
    const r = buildCouponPublicLines(c, 88)
    expect(r.remaining).toBe('Padrão 12 fim')
  })

  it('faixa com ocultar número usa só a frase da faixa', () => {
    const c = baseCoupon({
      public_message_bands: [
        {
          remaining_min: 1,
          remaining_max: 100,
          remaining_hide_number: true,
          remaining_message_only: 'Corra!',
        },
      ],
    })
    const r = buildCouponPublicLines(c, 50)
    expect(r.remaining).toBe('Corra!')
  })

  it('faixa com ocultar número e frase vazia volta ao padrão com número', () => {
    const c = baseCoupon({
      public_message_bands: [
        {
          remaining_min: 1,
          remaining_max: 100,
          remaining_hide_number: true,
          remaining_message_only: '',
        },
      ],
    })
    const r = buildCouponPublicLines(c, 50)
    expect(r.remaining).toBe('Padrão 50 fim')
  })
})
