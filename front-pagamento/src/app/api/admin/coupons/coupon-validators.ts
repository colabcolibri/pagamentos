import { z } from 'zod'

const uuidOrEmpty = z
  .union([z.string().uuid(), z.literal(''), z.null(), z.undefined()])
  .transform((v) => (v === '' || v === undefined ? null : v))

const optionalPositiveInt = z
  .union([z.number().int().positive(), z.nan(), z.null(), z.undefined()])
  .transform((v) =>
    v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v)) ? null : v
  )

const optionalIsoDate = z
  .union([z.string(), z.literal(''), z.null(), z.undefined()])
  .transform((v) => {
    if (v === '' || v === undefined || v === null) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  })

/** Texto opcional: vazio vira null; trim; limite de tamanho (ex.: descrição). */
function optionalBoundedText(max: number) {
  return z
    .union([z.string(), z.literal(''), z.null(), z.undefined()])
    .transform((v) => {
      if (v === '' || v === undefined || v === null) return null
      const t = String(v).trim()
      return t === '' ? null : t
    })
    .pipe(z.union([z.null(), z.string().max(max, `Máximo de ${max} caracteres`)]))
}

/** Frase opcional para concatenar: preserva espaços no fim/início; só null se só whitespace. */
function optionalPublicPhrase(max: number) {
  return z
    .union([z.string(), z.literal(''), z.null(), z.undefined()])
    .transform((v) => {
      if (v === '' || v === undefined || v === null) return null
      const s = String(v)
      return /^\s*$/.test(s) ? null : s
    })
    .pipe(z.union([z.null(), z.string().max(max, `Máximo de ${max} caracteres`)]))
}

const publicMessageBandSchema = z
  .object({
    remaining_min: z.number().int().min(0, 'Mínimo de usos restantes inválido'),
    remaining_max: z
      .union([z.number().int().min(0), z.null(), z.undefined()])
      .transform((v) => (v === undefined ? null : v)),
    remaining_prefix: optionalPublicPhrase(240).optional(),
    remaining_suffix: optionalPublicPhrase(240).optional(),
    remaining_hide_number: z.boolean().optional().default(false),
    remaining_message_only: optionalPublicPhrase(480).optional(),
  })
  .superRefine((b, ctx) => {
    if (b.remaining_max != null && b.remaining_max < b.remaining_min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O máximo de usos restantes não pode ser menor que o mínimo',
        path: ['remaining_max'],
      })
    }
    if (
      b.remaining_hide_number &&
      (b.remaining_message_only == null ||
        (typeof b.remaining_message_only === 'string' && b.remaining_message_only.trim() === ''))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a frase exibida ao ocultar o número nesta faixa',
        path: ['remaining_message_only'],
      })
    }
  })

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Código obrigatório')
      .max(64)
      .transform((s) => s.trim().toUpperCase()),
    discount_type: z.enum(['percent', 'fixed_cents']),
    discount_percent: z.union([z.number(), z.null(), z.undefined()]).optional(),
    discount_amount_cents: z.union([z.number().int(), z.null(), z.undefined()]).optional(),
    applies_to: z.enum(['avista', 'parcelado', 'both']),
    /** Lista de produtos permitidos; vazia = sem restrição por produto. */
    product_ids: z.array(z.string().uuid()).max(64).optional().default([]),
    product_id: uuidOrEmpty,
    /** Lista de preços permitidos; vazia = sem restrição por preço (só por produto, se houver). */
    price_ids: z.array(z.string().uuid()).max(128).optional().default([]),
    price_id: uuidOrEmpty,
    max_redemptions_total: optionalPositiveInt,
    max_redemptions_per_user: optionalPositiveInt,
    starts_at: optionalIsoDate,
    ends_at: optionalIsoDate,
    active: z.boolean().optional().default(true),
    description: optionalBoundedText(2000),
    public_show_remaining: z.boolean().optional().default(false),
    public_remaining_prefix: optionalPublicPhrase(240),
    public_remaining_suffix: optionalPublicPhrase(240),
    public_show_valid_until: z.boolean().optional().default(false),
    public_valid_until_prefix: optionalPublicPhrase(240),
    public_valid_until_suffix: optionalPublicPhrase(240),
    public_message_bands: z.array(publicMessageBandSchema).max(32).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percent') {
      const p = data.discount_percent
      if (p === undefined || p === null || typeof p !== 'number' || p < 0 || p > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentual entre 0 e 100',
          path: ['discount_percent'],
        })
      }
      if (data.discount_amount_cents != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Não use valor fixo com tipo percentual',
          path: ['discount_amount_cents'],
        })
      }
    } else {
      const c = data.discount_amount_cents
      if (c === undefined || c === null || typeof c !== 'number' || c < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valor fixo em centavos (mínimo 1)',
          path: ['discount_amount_cents'],
        })
      }
      if (data.discount_percent != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Não use percentual com tipo valor fixo',
          path: ['discount_percent'],
        })
      }
    }

    if (data.public_show_remaining && data.max_redemptions_total == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defina o limite total de usos para poder exibir quantos restam',
        path: ['public_show_remaining'],
      })
    }
    if (data.public_show_valid_until && !data.ends_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defina a data de fim do cupom para exibir a validade ao cliente',
        path: ['public_show_valid_until'],
      })
    }
  })

export type CreateCouponInput = z.infer<typeof createCouponSchema>

/** Ids únicos de produto: prioriza `product_ids`; senão usa `product_id` legado. */
export function normalizeCouponProductIds(data: CreateCouponInput): string[] {
  const fromList = Array.isArray(data.product_ids) ? data.product_ids : []
  const dedup = new Set<string>()
  for (const id of fromList) {
    if (typeof id === 'string' && id.length > 0) dedup.add(id)
  }
  if (dedup.size === 0 && data.product_id) dedup.add(data.product_id)
  return [...dedup]
}

/** Ids únicos de preço: prioriza `price_ids`; senão usa `price_id` legado. */
export function normalizeCouponPriceIds(data: CreateCouponInput): string[] {
  const fromList = Array.isArray(data.price_ids) ? data.price_ids : []
  const dedup = new Set<string>()
  for (const id of fromList) {
    if (typeof id === 'string' && id.length > 0) dedup.add(id)
  }
  if (dedup.size === 0 && data.price_id) dedup.add(data.price_id)
  return [...dedup]
}

export function toCouponInsertRow(
  data: CreateCouponInput,
  normalizedProductIds: string[],
  normalizedPriceIds: string[]
) {
  return {
    code: data.code,
    discount_type: data.discount_type,
    discount_percent: data.discount_type === 'percent' ? String(data.discount_percent) : null,
    discount_amount_cents:
      data.discount_type === 'fixed_cents' ? (data.discount_amount_cents ?? null) : null,
    applies_to: data.applies_to,
    product_id: normalizedProductIds[0] ?? null,
    price_id: normalizedPriceIds[0] ?? null,
    max_redemptions_total: data.max_redemptions_total,
    max_redemptions_per_user: data.max_redemptions_per_user,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    active: data.active ?? true,
    description: data.description ?? null,
    public_show_remaining: data.public_show_remaining ?? false,
    public_remaining_prefix: data.public_remaining_prefix ?? null,
    public_remaining_suffix: data.public_remaining_suffix ?? null,
    public_show_valid_until: data.public_show_valid_until ?? false,
    public_valid_until_prefix: data.public_valid_until_prefix ?? null,
    public_valid_until_suffix: data.public_valid_until_suffix ?? null,
    public_message_bands: data.public_message_bands ?? [],
  }
}
