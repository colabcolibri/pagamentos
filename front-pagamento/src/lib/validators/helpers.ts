import type { NextResponse } from 'next/server'

import type { ZodError, ZodSchema } from 'zod'
import { z } from 'zod'

import { apiErrorResponse } from '@/lib/errors/error-handler'

const uuidSchema = z.string().uuid()

/**
 * Valida parâmetro de path como UUID. Retorna NextResponse 400 se inválido.
 * Uso: const invalid = validateUuidParam(id); if (invalid) return invalid;
 */
export function validateUuidParam(id: string): NextResponse | null {
  const result = uuidSchema.safeParse(id)
  if (result.success) return null
  return apiErrorResponse({
    error: 'ID inválido. Deve ser um UUID.',
    code: 'INVALID_ID',
    status: 400,
  })
}

/**
 * Resultado da validação
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: ZodError
}

/**
 * Valida dados usando um schema Zod
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    error: result.error,
  }
}

/**
 * Helper para validar request body em API routes
 * Retorna NextResponse com erro se a validação falhar
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = validate(schema, data)

  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    response: apiErrorResponse({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: result.error?.flatten().fieldErrors,
      status: 400,
    }),
  }
}

/**
 * Helper para validar query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): { success: true; data: T } | { success: false; response: NextResponse } {
  // Converte URLSearchParams ou Record para objeto simples
  const params: Record<string, unknown> = {}

  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => {
      // Se já existe, transforma em array
      if (params[key]) {
        params[key] = Array.isArray(params[key])
          ? [...(params[key] as string[]), value]
          : [params[key] as string, value]
      } else {
        params[key] = value
      }
    })
  } else {
    Object.assign(params, searchParams)
  }

  const result = validate(schema, params)

  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    response: apiErrorResponse({
      error: 'Parâmetros de query inválidos',
      code: 'VALIDATION_ERROR',
      details: result.error?.flatten().fieldErrors,
      status: 400,
    }),
  }
}
