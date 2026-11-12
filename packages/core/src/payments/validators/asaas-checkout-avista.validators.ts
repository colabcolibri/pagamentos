import { z } from 'zod'

import { optionalCouponCodeSchema } from './coupon-code.validators'
import { refineAsaasCustomerFullName } from './customer-full-name.validators'

const customerInfoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200).transform((s) => s.trim()),
  email: z.string().email('Email inválido').max(255),
  phone: z
    .string()
    .min(1, 'Telefone é obrigatório')
    .max(30)
    .transform((s) => s.replace(/\D/g, ''))
    .refine((digits) => digits.length >= 10, 'Telefone deve ter pelo menos 10 dígitos'),
  document: z.string().max(30).optional(),
  person_type: z.enum(['fisica', 'juridica']).optional(),
  cpf: z.string().max(14).optional(),
  cnpj: z.string().max(18).optional(),
  razao_social: z.string().max(200).optional(),
  ie: z.string().max(20).optional(),
  im: z.string().max(20).optional(),
  cep: z.string().max(9).optional(),
  address: z.string().max(300).optional(),
  address_number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
})

/**
 * Schema para checkout Asaas à vista (Checkout API).
 * PIX e Cartão 1x — cliente escolhe na página Asaas. Valor com desconto quando configurado.
 */
export const asaasCheckoutAvistaBodySchema = z
  .object({
    price_id: z.string().uuid('price_id deve ser um UUID válido'),
    customer_info: customerInfoSchema,
    force_new: z.boolean().optional(),
    coupon_code: optionalCouponCodeSchema,
    /** Add-ons permitidos para este preço (âncora) em `price_addon_offers`. */
    addon_price_ids: z.array(z.string().uuid()).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    refineAsaasCustomerFullName(data.customer_info, ctx, ['customer_info'])
  })

export type AsaasCheckoutAvistaBody = z.infer<typeof asaasCheckoutAvistaBodySchema>
