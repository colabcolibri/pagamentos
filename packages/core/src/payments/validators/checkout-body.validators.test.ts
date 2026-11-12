import { describe, it, expect } from 'vitest'
import { checkoutBodySchema } from './checkout-body.validators'

const validPriceId = '550e8400-e29b-41d4-a716-446655440000'

describe('checkoutBodySchema', () => {
  describe('body válido', () => {
    it('aceita price_id UUID e customer_info name/email', () => {
      const body = {
        price_id: validPriceId,
        customer_info: {
          name: 'João Silva',
          email: 'joao@example.com',
        },
      }
      const result = checkoutBodySchema.safeParse(body)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_id).toBe(validPriceId)
        expect(result.data.customer_info.name).toBe('João Silva')
        expect(result.data.customer_info.email).toBe('joao@example.com')
      }
    })

    it('aceita campos opcionais: person_type, cpf, cnpj, endereço', () => {
      const body = {
        price_id: validPriceId,
        customer_info: {
          name: 'Maria',
          email: 'maria@example.com',
          person_type: 'fisica',
          cpf: '123.456.789-09',
          cep: '01310-100',
          address: 'Av. Paulista',
          address_number: '1000',
          city: 'São Paulo',
          state: 'SP',
        },
      }
      const result = checkoutBodySchema.safeParse(body)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customer_info.person_type).toBe('fisica')
        expect(result.data.customer_info.cpf).toBe('123.456.789-09')
        expect(result.data.customer_info.city).toBe('São Paulo')
      }
    })

    it('aceita installments entre 1 e 12', () => {
      const body = {
        price_id: validPriceId,
        customer_info: { name: 'A', email: 'a@b.com' },
        installments: 3,
      }
      expect(checkoutBodySchema.safeParse(body).success).toBe(true)
      expect(checkoutBodySchema.safeParse({ ...body, installments: 1 }).success).toBe(true)
      expect(checkoutBodySchema.safeParse({ ...body, installments: 12 }).success).toBe(true)
    })

    it('aceita force_new opcional', () => {
      const result = checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: 'A', email: 'a@b.com' },
        force_new: true,
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.force_new).toBe(true)
    })

    it('aceita addon_price_ids opcional (UUIDs)', () => {
      const other = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      const result = checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: 'A', email: 'a@b.com' },
        addon_price_ids: [other],
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.addon_price_ids).toEqual([other])
    })
  })

  describe('body inválido', () => {
    it('rejeita price_id não-UUID', () => {
      const result = checkoutBodySchema.safeParse({
        price_id: 'not-a-uuid',
        customer_info: { name: 'João', email: 'joao@example.com' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('price_id'))).toBe(true)
      }
    })

    it('rejeita email inválido', () => {
      const result = checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: 'João', email: 'email-invalido' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.join('.').includes('customer_info') && i.path.join('.').includes('email'))).toBe(true)
      }
    })

    it('rejeita installments fora de 1–12', () => {
      expect(checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: 'A', email: 'a@b.com' },
        installments: 0,
      }).success).toBe(false)
      expect(checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: 'A', email: 'a@b.com' },
        installments: 13,
      }).success).toBe(false)
    })

    it('rejeita sem customer_info', () => {
      const result = checkoutBodySchema.safeParse({
        price_id: validPriceId,
      })
      expect(result.success).toBe(false)
    })

    it('rejeita nome vazio', () => {
      const result = checkoutBodySchema.safeParse({
        price_id: validPriceId,
        customer_info: { name: '', email: 'a@b.com' },
      })
      expect(result.success).toBe(false)
    })
  })
})
