import { z } from 'zod'

import { uuidSchema } from '@/lib/validators/common'

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
    amount_cents: z.number().int().positive('Valor deve ser maior que zero'),
    payment_gateway: z.enum(['pagarme', 'asaas']),
    payment_method: z.string().optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.any().optional().nullable(), // Json type do database
  }),

  update: z.object({
    status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired']).optional(),
    payment_method: z.string().optional().nullable(),
    paid_at: z.string().datetime().optional().nullable(),
    cancelled_at: z.string().datetime().optional().nullable(),
    refunded_at: z.string().datetime().optional().nullable(),
    expires_at: z.string().datetime().optional().nullable(),
    metadata: z.any().optional().nullable(), // Json type do database
  }),

  updateStatus: z.object({
    status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired']),
  }),

  get: z.object({
    userId: uuidSchema.optional(),
    status: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? (val.split(',') as Array<
              'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'
            >)
          : undefined
      ),
    orderType: z.enum(['subscription', 'one_time']).optional(),
    paymentGateway: z.enum(['pagarme', 'asaas']).optional(),
    paymentMethod: z.string().optional(),
    includeRelations: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    orderBy: z.enum(['created_at', 'updated_at', 'paid_at', 'amount_cents']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  }),

  getById: z.object({
    id: uuidSchema,
    includeRelations: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),

  resendEmail: z.object({
    orderId: uuidSchema,
    emailType: z.enum(['order_created', 'payment_confirmed']),
  }),
}
