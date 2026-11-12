import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { findActiveSession } from '@/lib/auth/session'
import { publicEnv } from '@/lib/config/env'
import { apiErrorResponse } from '@/lib/errors/error-handler'
import { getLogger } from '@/lib/logger'

// ============================================================================
// CONTEÚDO - Centralizado no topo para fácil edição
// ============================================================================
const CONTENT = {
  errors: {
    unauthorized: 'Não autorizado - usuário não autenticado',
    internalAuth: 'Erro interno de autenticação',
    verifyPermissions: 'Erro ao verificar permissões',
    adminOnly: 'Não autorizado - apenas administradores têm acesso a esta funcionalidade',
    internalAuthorization: 'Erro interno de autorização',
  },
  logs: {
    retryAuth: (retries: number) =>
      `Erro temporário, tentando novamente (${retries} tentativas restantes)`,
    retryException: (retries: number) =>
      `Exceção capturada, tentando novamente (${retries} tentativas restantes)`,
    authFailed: 'Falhou após todas as tentativas',
    authError: 'Erro na verificação de autenticação',
    adminCheckError: 'Erro ao verificar status de admin',
    unauthorizedAdminAccess: (userId: string) =>
      `Tentativa de acesso não autorizado à API admin por: ${userId}`,
    adminVerificationError: 'Erro na verificação de admin',
  },
} as const

// ==========================================
// TIPOS
// ==========================================

interface AuthResult {
  success: true
  user: {
    id: string
    email: string | undefined
  }
}

interface AuthError {
  success: false
  response: NextResponse
}

type AuthGuardResult = AuthResult | AuthError

function toSafeLogError(error: unknown): { message: string; status?: number } {
  if (error instanceof Error) {
    return { message: error.message }
  }
  const o = error as { message?: string; status?: number }
  if (o && typeof o.message === 'string') {
    return { message: o.message, status: typeof o.status === 'number' ? o.status : undefined }
  }
  return { message: String(error) }
}

export async function requireAuth(): Promise<AuthGuardResult & { isAdmin?: boolean }> {
  const logger = getLogger()

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(publicEnv.NEXT_PUBLIC_AUTH_COOKIE_NAME)?.value
    const session = await findActiveSession(token)
    if (!session) {
      return {
        success: false,
        response: apiErrorResponse({
          error: CONTENT.errors.unauthorized,
          code: 'UNAUTHORIZED',
          status: 401,
        }),
      }
    }
    return {
      success: true,
      isAdmin: session.isAdmin,
      user: {
        id: session.profileId,
        email: session.email,
      },
    }
  } catch (error) {
    logger.error(CONTENT.logs.authError, toSafeLogError(error))
    return {
      success: false,
      response: apiErrorResponse({
        error: CONTENT.errors.internalAuth,
        code: 'INTERNAL_ERROR',
        status: 500,
      }),
    }
  }
}

// ==========================================
// GUARD PARA VERIFICAR SE USUÁRIO É ADMIN
// ==========================================

export async function requireAdmin(): Promise<
  | {
      success: true
      user: { id: string; email: string | undefined }
    }
  | { success: false; response: NextResponse }
> {
  const logger = getLogger()

  // Primeiro verifica se está autenticado
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  try {
    if (!authResult.isAdmin) {
      logger.warn(CONTENT.logs.unauthorizedAdminAccess(authResult.user.id), {
        userId: authResult.user.id,
      })
      return {
        success: false,
        response: apiErrorResponse({
          error: CONTENT.errors.adminOnly,
          code: 'FORBIDDEN',
          status: 403,
        }),
      }
    }

    return {
      success: true,
      user: authResult.user,
    }
  } catch (error) {
    logger.error(CONTENT.logs.adminVerificationError, {
      ...toSafeLogError(error),
      userId: authResult.user.id,
    })
    return {
      success: false,
      response: apiErrorResponse({
        error: CONTENT.errors.internalAuthorization,
        code: 'INTERNAL_ERROR',
        status: 500,
      }),
    }
  }
}
