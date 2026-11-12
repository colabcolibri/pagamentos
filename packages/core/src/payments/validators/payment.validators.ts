import { z } from 'zod'

/**
 * Schema para UUID
 */
const uuidSchema = z.string().uuid('ID inválido')

/**
 * Validators para Payment
 */
export const paymentValidators = {
  create: z.object({
    user_id: uuidSchema,
    product_id: uuidSchema,
    price_id: uuidSchema,
    order_id: uuidSchema.optional().nullable(),
    amount_cents: z.number().int().positive('Valor deve ser positivo'),
    currency: z.string().default('BRL'),
    gateway: z.enum(['pagarme', 'asaas']),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  update: z.object({
    status: z
      .enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired', 'incomplete'])
      .optional(),
    payment_link_id: z.string().optional().nullable(),
    payment_link_url: z.string().url().optional().nullable(),
    invoice_id: z.string().optional().nullable(),
    invoice_url: z.string().url().optional().nullable(),
    paid_at: z.string().datetime().optional().nullable(),
    cancelled_at: z.string().datetime().optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  get: z.object({
    userId: uuidSchema.optional(),
    productId: uuidSchema.optional(),
    priceId: uuidSchema.optional(),
    orderId: uuidSchema.optional(),
    status: z
      .enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired', 'incomplete'])
      .optional(),
    gateway: z.enum(['pagarme', 'asaas']).optional(),
    orderBy: z.enum(['created_at', 'updated_at', 'paid_at', 'amount_cents']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
}

/**
 * Validators para Order
 */
export const orderValidators = {
  create: z.object({
    user_id: uuidSchema,
    product_id: uuidSchema,
    price_id: uuidSchema,
    subscription_id: uuidSchema.optional().nullable(),
    order_type: z.enum(['subscription', 'one_time']),
    amount_cents: z.number().int().positive('Valor deve ser positivo'),
    payment_gateway: z.enum(['pagarme', 'asaas']),
    payment_method: z.string().optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  update: z.object({
    status: z
      .enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'])
      .optional(),
    payment_method: z.string().optional().nullable(),
    paid_at: z.string().datetime().optional().nullable(),
    cancelled_at: z.string().datetime().optional().nullable(),
    refunded_at: z.string().datetime().optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  }),

  get: z.object({
    userId: uuidSchema.optional(),
    status: z
      .enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'])
      .optional(),
    orderType: z.enum(['subscription', 'one_time']).optional(),
    paymentGateway: z.enum(['pagarme', 'asaas']).optional(),
    paymentMethod: z.string().optional(),
    includeRelations: z.coerce.boolean().optional(),
    orderBy: z.enum(['created_at', 'updated_at', 'paid_at', 'amount_cents']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),

  getById: z.object({
    id: uuidSchema,
  }),
}

