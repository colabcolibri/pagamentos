import { z } from 'zod'

/** Código opcional: trim, vazio vira undefined, maiúsculas para bater com a tabela. */
export const optionalCouponCodeSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .optional()
  .transform((val) => {
    if (val == null || val === '') return undefined
    const t = String(val).trim()
    return t.length === 0 ? undefined : t.toUpperCase()
  })
