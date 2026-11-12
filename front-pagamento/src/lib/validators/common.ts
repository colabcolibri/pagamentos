import { z } from 'zod'

/**
 * Schemas comuns reutilizáveis
 */

export const uuidSchema = z.string().uuid('ID deve ser um UUID válido')

export const emailSchema = z.string().email('Email inválido').toLowerCase().trim()

export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().positive().max(100).optional()),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().nonnegative().optional()),
})

export const dateStringSchema = z.string().datetime()

export const urlSchema = z.string().url('URL inválida')
