import { z } from 'zod'

import { uuidSchema } from '@/lib/validators/common'

/**
 * Validators para Product
 */
export const pricePromoTierSchema = z.object({
  id: uuidSchema.optional(),
  sort_order: z.number().int().min(0),
  discount_percent: z.number().int().min(0).max(100),
  ends_at: z
    .union([z.string(), z.null()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  max_units: z.union([z.number().int().positive(), z.null()]).optional().nullable(),
  applies_to: z.enum(['avista', 'parcelado', 'both']).optional().default('both'),
})

export const priceCreateSchema = z.object({
  ref: z.string().min(1, 'Ref do preço é obrigatório').max(100, 'Ref muito longo'),
  amount: z.number().int().min(0, 'Amount deve ser >= 0'),
  currency: z.string().max(10).optional(),
  recurring: z.boolean().optional(),
  interval: z
    .enum(['day', 'week', 'month', 'year'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  interval_count: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.any().optional().nullable(), // Json type do database
  email_addon: z.any().optional().nullable(),
  stock_cap: z.union([z.number().int().positive(), z.null()]).optional().nullable(),
  promo_tiers: z.array(pricePromoTierSchema).optional(),
})

export const priceUpdateSchema = z.object({
  id: uuidSchema,
  ref: z.string().min(1).max(100).optional(),
  amount: z.number().int().min(0).optional(),
  currency: z.string().max(10).optional(),
  recurring: z.boolean().optional(),
  interval: z
    .enum(['day', 'week', 'month', 'year'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  interval_count: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.any().optional().nullable(), // Json type do database
  email_addon: z.any().optional().nullable(),
  stock_cap: z.union([z.number().int().positive(), z.null()]).optional().nullable(),
  promo_tiers: z.array(pricePromoTierSchema).optional(),
  upgrade_to_price_ids: z.array(uuidSchema).optional(),
  addon_price_ids: z.array(uuidSchema).optional(),
})

export const productValidators = {
  create: z
    .object({
      name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
      ref: z.string().min(1, 'Ref é obrigatório').max(100, 'Ref muito longo'),
      description: z.string().max(5000, 'Descrição muito longa').optional().nullable(),
      active: z.boolean().optional(),
      payment_methods: z.array(z.string()).optional().nullable(),
      refund_policy: z.any().optional().nullable(), // Json type do database
      email_config: z.any().optional().nullable(), // Json type do database
      webhook_url: z
        .union([z.string().url('URL inválida').max(2048), z.literal('')])
        .optional()
        .nullable()
        .transform((v) => (v === '' ? null : v)),
      webhook_secret: z
        .string()
        .max(256)
        .optional()
        .nullable()
        .transform((v) => (v === '' ? null : v)),
      metadata: z.any().optional().nullable(), // Json type do database
      allow_custom_amount: z.boolean().optional(),
      min_amount_cents: z
        .number()
        .int()
        .min(100, 'Valor mínimo deve ser >= 100 centavos')
        .optional(),
      max_amount_cents: z
        .union([z.number().int().min(100), z.null()])
        .optional()
        .nullable(),
      prices: z.array(priceCreateSchema).optional(),
    })
    .refine(
      (data) =>
        data.max_amount_cents == null || data.max_amount_cents >= (data.min_amount_cents ?? 100),
      {
        message: 'max_amount_cents deve ser >= min_amount_cents',
        path: ['max_amount_cents'],
      }
    ),

  update: z
    .object({
      name: z.string().min(1, 'Nome não pode ser vazio').max(255, 'Nome muito longo').optional(),
      ref: z.string().min(1, 'Ref não pode ser vazio').max(100, 'Ref muito longo').optional(),
      description: z.string().max(5000, 'Descrição muito longa').optional().nullable(),
      active: z.boolean().optional(),
      payment_methods: z.array(z.string()).optional().nullable(),
      refund_policy: z.any().optional().nullable(), // Json type do database
      email_config: z.any().optional().nullable(), // Json type do database
      webhook_url: z
        .union([z.string().url('URL inválida').max(2048), z.literal('')])
        .optional()
        .nullable()
        .transform((v) => (v === '' ? null : v)),
      webhook_secret: z
        .string()
        .max(256)
        .optional()
        .nullable()
        .transform((v) => (v === '' ? null : v)),
      metadata: z.any().optional().nullable(), // Json type do database
      allow_custom_amount: z.boolean().optional(),
      min_amount_cents: z
        .number()
        .int()
        .min(100, 'Valor mínimo deve ser >= 100 centavos')
        .optional(),
      max_amount_cents: z
        .union([z.number().int().min(100), z.null()])
        .optional()
        .nullable(),
      prices: z.array(priceUpdateSchema).optional(),
    })
    .refine(
      (data) =>
        data.max_amount_cents == null || data.max_amount_cents >= (data.min_amount_cents ?? 100),
      {
        message: 'max_amount_cents deve ser >= min_amount_cents',
        path: ['max_amount_cents'],
      }
    ),

  get: z.object({
    active: z.preprocess(
      (val) => (Array.isArray(val) ? val[0] : val),
      z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
    ),
  }),

  getById: z.object({
    id: uuidSchema,
  }),
}
