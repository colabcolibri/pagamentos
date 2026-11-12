import type { DomainError } from './base-error'
import {
    ConflictError,
    DatabaseError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from './domain-errors'

/**
 * Contexto adicional para tratamento de erros
 */
export interface ErrorContext {
  module?: string
  action?: string
  userId?: string
  requestId?: string
  [key: string]: unknown
}

/**
 * Resultado do tratamento de erro
 */
export interface ErrorResult {
  error: string
  code: string
  statusCode: number
  field?: string
  resource?: string
  identifier?: string | number
  requiredPermission?: string
  details?: Record<string, unknown>
}

/**
 * Trata erros e retorna resultado estruturado
 * Útil para frameworks que não usam NextResponse
 */
export function handleError(error: unknown, context?: ErrorContext): ErrorResult {
  // Erros de domínio
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      field: error.field,
      details: error.details,
    }
  }

  if (error instanceof NotFoundError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      resource: error.details?.resource as string,
      identifier: error.details?.identifier as string | number,
      details: error.details,
    }
  }

  if (error instanceof UnauthorizedError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof ForbiddenError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requiredPermission: error.requiredPermission,
      details: error.details,
    }
  }

  if (error instanceof ConflictError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof DatabaseError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof InternalServerError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  // Erros genéricos do JavaScript
  if (error instanceof Error) {
    const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
    return {
      error: isProduction ? 'Erro interno do servidor' : error.message,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      ...(!isProduction && { details: { stack: error.stack } }),
    }
  }

  // Erros desconhecidos
  return {
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
  }
}

/**
 * Verifica se um erro é um erro de domínio
 */
export function isDomainError(error: unknown): error is DomainError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'statusCode' in error &&
    error instanceof Error
  )
}

