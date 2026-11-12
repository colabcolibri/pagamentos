import { z } from 'zod'

import { uuidSchema } from '@/lib/validators/common'

/**
 * Validators para Product
 */
const pricePromoTierSchema = z.object({
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

const priceCreateSchema = z.object({
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

const priceUpdateSchema = z.object({
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
  create: z.object({
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
    prices: z.array(priceCreateSchema).optional(),
  }),

  update: z.object({
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
    prices: z.array(priceUpdateSchema).optional(),
  }),

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
