import { DomainError } from './base-error'

/**
 * Erro de validação - dados inválidos
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    message: string,
    public readonly field?: string,
    details?: Record<string, unknown>
  ) {
    super(message, { ...details, field })
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(resource: string, identifier?: string | number, details?: Record<string, unknown>) {
    const message = identifier
      ? `${resource} com ID "${identifier}" não encontrado`
      : `${resource} não encontrado`
    super(message, { ...details, resource, identifier })
  }
}

/**
 * Erro de não autorizado
 */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED'
  readonly statusCode = 401

  constructor(message = 'Não autorizado', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Erro de acesso negado (forbidden)
 */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403

  constructor(
    message = 'Acesso negado',
    public readonly requiredPermission?: string,
    details?: Record<string, unknown>
  ) {
    super(message, { ...details, requiredPermission })
  }
}

/**
 * Erro de conflito (ex: recurso já existe)
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT'
  readonly statusCode = 409

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Erro interno do servidor
 */
export class InternalServerError extends DomainError {
  readonly code = 'INTERNAL_SERVER_ERROR'
  readonly statusCode = 500

  constructor(message = 'Erro interno do servidor', details?: Record<string, unknown>) {
    super(message, details)
  }
}
