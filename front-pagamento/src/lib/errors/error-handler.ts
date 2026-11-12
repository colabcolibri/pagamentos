import { NextResponse } from 'next/server'

import { getLogger } from '@/lib/logger'

import { DomainError } from './base-error'
import { ForbiddenError, NotFoundError, ValidationError } from './domain-errors'

/**
 * Formato padrão de erro da API: { error, code, details? } (Fase 9.11)
 */
export function apiErrorResponse(options: {
  error: string
  code?: string
  details?: unknown
  status?: number
}): NextResponse {
  const { error, code = 'ERROR', details, status = 400 } = options
  const body: { error: string; code: string; details?: unknown } = { error, code }
  if (details !== undefined && details !== null) body.details = details
  return NextResponse.json(body, { status })
}

export function databaseErrorResponse(): NextResponse {
  return apiErrorResponse({
    error: 'Erro no banco de dados',
    code: 'DATABASE_ERROR',
    status: 500,
  })
}

/**
 * Contexto adicional para logging de erros
 */
interface ErrorContext {
  module?: string
  action?: string
  userId?: string
  method?: string
  url?: string
  [key: string]: unknown
}

/**
 * Interface para handlers de erro (Strategy Pattern)
 */
interface ErrorHandler {
  canHandle(error: unknown): boolean
  handle(error: unknown, context?: ErrorContext): NextResponse
}

/**
 * Handler para erros de domínio (DomainError)
 */
class DomainErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return error instanceof DomainError
  }

  handle(error: unknown, _context?: ErrorContext): NextResponse {
    const domainError = error as DomainError
    return NextResponse.json(
      {
        error: domainError.message,
        code: domainError.code,
        // Propriedades específicas de cada tipo de erro
        ...(domainError instanceof ValidationError && {
          field: domainError.field,
        }),
        ...(domainError instanceof ForbiddenError && {
          requiredPermission: domainError.requiredPermission,
        }),
        ...(domainError instanceof NotFoundError && {
          resource: domainError.details?.resource,
          identifier: domainError.details?.identifier,
        }),
        // Detalhes adicionais (inclui resource/identifier do NotFoundError,
        // e outros detalhes de qualquer DomainError)
        ...(domainError.details && { details: domainError.details }),
      },
      { status: domainError.statusCode }
    )
  }
}

const DATABASE_ERROR_MAP: Record<string, { error: string; code: string; status: number }> = {
  '23505': {
    error: 'Recurso já existe',
    code: 'CONFLICT',
    status: 409,
  },
  '42501': {
    error: 'Acesso negado',
    code: 'FORBIDDEN',
    status: 403,
  },
}

/**
 * Verifica se é um erro de validação do banco (trigger/constraint)
 */
function isValidationError(error: { code: string; message?: string }): boolean {
  const msg = error.message ?? ''
  return error.code === 'P0001' || msg.includes('does not exist') || msg.includes('Invalid')
}

class DatabaseClientErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'code' in error && 'message' in error
  }

  handle(error: unknown, _context?: ErrorContext): NextResponse {
    const databaseError = error as { code: string; message: string }
    const isProduction = process.env.NODE_ENV === 'production'

    const knownError = DATABASE_ERROR_MAP[databaseError.code]
    if (knownError) {
      return NextResponse.json(
        { error: knownError.error, code: knownError.code },
        { status: knownError.status }
      )
    }

    // Verificar se é um erro de validação (trigger/constraint)
    if (isValidationError(databaseError)) {
      const message = isProduction ? 'Erro de validação no banco de dados' : databaseError.message

      return NextResponse.json(
        {
          error: message,
          code: 'VALIDATION_ERROR',
          ...(!isProduction && { details: databaseError }),
        },
        { status: 400 }
      )
    }

    const message = isProduction ? 'Erro no banco de dados' : databaseError.message

    return NextResponse.json(
      {
        error: message,
        code: 'DATABASE_ERROR',
        ...(!isProduction && { details: databaseError }),
      },
      { status: 500 }
    )
  }
}

/**
 * Handler para erros genéricos do JavaScript (Error)
 */
class GenericErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return error instanceof Error
  }

  handle(error: unknown, _context?: ErrorContext): NextResponse {
    const genericError = error as Error
    const isProduction = process.env.NODE_ENV === 'production'
    const message = isProduction ? 'Erro interno do servidor' : genericError.message

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_SERVER_ERROR',
        ...(!isProduction && { stack: genericError.stack }),
      },
      { status: 500 }
    )
  }
}

/**
 * Handler padrão para erros desconhecidos
 */
class UnknownErrorHandler implements ErrorHandler {
  canHandle(_error: unknown): boolean {
    return true // Sempre pode lidar (fallback)
  }

  handle(_error: unknown, _context?: ErrorContext): NextResponse {
    return NextResponse.json(
      { error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * Cadeia de handlers usando Chain of Responsibility Pattern
 * Ordem importa: mais específicos primeiro, genéricos por último
 */
const ERROR_HANDLERS: ErrorHandler[] = [
  new DomainErrorHandler(),
  new DatabaseClientErrorHandler(),
  new GenericErrorHandler(),
  new UnknownErrorHandler(), // Sempre o último (fallback)
]

/**
 * Mapeia erros de domínio para respostas HTTP
 * Usa Chain of Responsibility Pattern para processar erros
 */
export function handleApiError(error: unknown, context?: ErrorContext): NextResponse {
  const logger = getLogger()

  // Log do erro
  logger.error(
    context?.action ? `Erro em ${context.module || 'api'}:${context.action}` : 'Erro em API route',
    error,
    context
  )

  // Processar erro através da cadeia de handlers
  for (const handler of ERROR_HANDLERS) {
    if (handler.canHandle(error)) {
      return handler.handle(error, context)
    }
  }

  // Fallback (não deveria chegar aqui devido ao UnknownErrorHandler)
  return NextResponse.json(
    { error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' },
    { status: 500 }
  )
}

/**
 * Helper para criar handlers de API routes com tratamento de erro automático
 *
 * @example
 * ```ts
 * export const GET = createApiHandler(async (request) => {
 *   // sua lógica aqui
 *   return NextResponse.json({ data: 'ok' })
 * }, { module: 'users', action: 'get_profile' })
 * ```
 */
export function createApiHandler(
  handler: (request: Request, ...args: unknown[]) => Promise<NextResponse>,
  context?: ErrorContext
) {
  return async (request: Request, ...args: unknown[]) => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      return handleApiError(error, {
        ...context,
        method: request.method,
        url: request.url,
      })
    }
  }
}

/**
 * Helper para handlers com params (Next.js 15)
 */
export function createApiHandlerWithParams<T extends Record<string, string>>(
  handler: (request: Request, context: { params: Promise<T> }) => Promise<NextResponse>,
  context?: ErrorContext
) {
  return async (request: Request, { params }: { params: Promise<T> }) => {
    try {
      return await handler(request, { params })
    } catch (error) {
      return handleApiError(error, {
        ...context,
        method: request.method,
        url: request.url,
      })
    }
  }
}
