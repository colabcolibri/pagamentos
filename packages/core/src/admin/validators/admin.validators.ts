import { z } from 'zod'

/**
 * Schema para UUID
 */
const uuidSchema = z.string().uuid('ID inválido')

/**
 * Schema para email
 */
const emailSchema = z.string().email('Email inválido')

/**
 * Validators para Admin
 */
export const adminValidators = {
  create: z.object({
    email: emailSchema,
    name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
    role: z.enum(['admin', 'super_admin']).optional(),
    is_active: z.boolean().optional(),
  }),

  update: z.object({
    name: z.string().min(1, 'Nome não pode ser vazio').max(255, 'Nome muito longo').optional(),
    role: z.enum(['admin', 'super_admin']).optional(),
    is_active: z.boolean().optional(),
  }),

  get: z.object({
    email: emailSchema.optional(),
    role: z.enum(['admin', 'super_admin']).optional(),
    isActive: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
    orderBy: z.enum(['created_at', 'updated_at', 'name', 'email']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),

  getById: z.object({
    id: uuidSchema,
  }),

  getByEmail: z.object({
    email: emailSchema,
  }),

  hasPermission: z.object({
    adminId: uuidSchema,
    permission: z.string().min(1, 'Permissão é obrigatória'),
  }),

  promoteUserToAdmin: z.object({
    email: emailSchema,
    name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
    role: z.enum(['admin', 'super_admin']).optional(),
  }),
}

