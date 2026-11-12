import { z } from 'zod'

import { optionalCouponCodeSchema } from './coupon-code.validators'

const customerInfoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().max(30).optional(),
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
 * Schema para o body da API de checkout (Pagar.me e Asaas).
 * Usar .safeParse(body) nas rotas e retornar 400 com details em caso de falha.
 */
export const checkoutBodySchema = z.object({
  price_id: z.string().uuid('price_id deve ser um UUID válido'),
  customer_info: customerInfoSchema,
  billing_type: z.string().max(50).optional(),
  installments: z.number().int().min(1).max(12).optional(),
  /** Força criar novo link mesmo com cobrança pendente (ex: usuário voltou e quer mudar meio de pagamento) */
  force_new: z.boolean().optional(),
  coupon_code: optionalCouponCodeSchema,
  /** Só suportado no fluxo Asaas; Pagar.me retorna 400 se enviado. */
  addon_price_ids: z.array(z.string().uuid()).max(20).optional(),
})

export type CheckoutBody = z.infer<typeof checkoutBodySchema>
