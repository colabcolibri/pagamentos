import { describe, expect, it } from 'vitest'

import {
  getAllowedMethods,
  getGatewayForMethod,
  isPaymentMethodAllowed,
} from './payment-methods'

describe('payment-methods', () => {
  describe('getGatewayForMethod', () => {
    it('retorna asaas para todos os métodos (gateway prioritário)', () => {
      expect(getGatewayForMethod('credit_card')).toBe('asaas')
      expect(getGatewayForMethod('pix')).toBe('asaas')
      expect(getGatewayForMethod('boleto')).toBe('asaas')
      expect(getGatewayForMethod('asaas_boleto_parcelado')).toBe('asaas')
    })
  })

  describe('getAllowedMethods', () => {
    it('retorna todos os métodos quando product não tem payment_methods', () => {
      const product = {}
      expect(getAllowedMethods(product)).toEqual([
        'credit_card',
        'pix',
        'boleto',
        'asaas_boleto_parcelado',
      ])
    })

    it('retorna apenas métodos configurados no produto', () => {
      const product = { payment_methods: ['credit_card', 'pix'] }
      expect(getAllowedMethods(product)).toEqual(['credit_card', 'pix'])
    })
  })

  describe('isPaymentMethodAllowed', () => {
    it('retorna true quando método está na lista', () => {
      const product = { payment_methods: ['pix', 'boleto'] }
      expect(isPaymentMethodAllowed(product, 'pix')).toBe(true)
    })

    it('retorna false quando método não está na lista', () => {
      const product = { payment_methods: ['pix'] }
      expect(isPaymentMethodAllowed(product, 'boleto')).toBe(false)
    })

    it('retorna true quando product não tem payment_methods', () => {
      const product = {}
      expect(isPaymentMethodAllowed(product, 'credit_card')).toBe(true)
    })
  })
})
