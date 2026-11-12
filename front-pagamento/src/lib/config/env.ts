/**
 * Configuração centralizada de variáveis de ambiente
 *
 * Este arquivo valida e exporta todas as variáveis de ambiente necessárias
 * para o funcionamento da aplicação.
 *
 * IMPORTANTE: Usa getters para acesso lazy às variáveis, evitando problemas
 * durante a importação do módulo no Next.js (variáveis NEXT_PUBLIC_* são
 * injetadas no build time e podem não estar disponíveis na importação).
 *
 * Benefícios:
 * - Validação lazy (só valida quando acessado)
 * - Funciona tanto no servidor quanto no cliente
 * - Fonte única de verdade para env vars
 * - Type safety com TypeScript
 * - Separação clara entre variáveis públicas e privadas
 */
import { parseBrandConfig } from '@/lib/brand/brand-config'

/**
 * Valida se uma variável de ambiente obrigatória está definida
 * Só valida quando realmente acessada
 */
function validateRequiredEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Variável de ambiente obrigatória não encontrada: ${key}\n` +
        `💡 Configure esta variável no arquivo .env.local ou nas variáveis de ambiente do sistema.`
    )
  }
  return value
}

// ============================================================================
// Variáveis de ambiente públicas (NEXT_PUBLIC_*)
// Podem ser usadas no cliente e no servidor
// IMPORTANTE: Essas variáveis são expostas no bundle do cliente!
// ============================================================================

export const publicEnv = {
  // Autenticação e cookies (público)
  get NEXT_PUBLIC_AUTH_COOKIE_NAME() {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || 'quitou_token'
  },
  get NEXT_PUBLIC_COOKIE_DOMAIN() {
    return process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  },

  // URLs da aplicação (público)
  get NEXT_PUBLIC_APP_URL() {
    const explicit = process.env.NEXT_PUBLIC_APP_URL
    if (explicit?.trim()) return explicit
    throw new Error(
      '❌ APP_URL não definida. Configure NEXT_PUBLIC_APP_URL (ex.: http://localhost:3004 no dev, https://do-dominio no servidor).'
    )
  },
  /** Base URL para callbacks do Asaas. Use HTTPS (ex: ngrok) quando APP_URL for localhost — Asaas rejeita HTTP. */
  get NEXT_PUBLIC_ASAAS_CALLBACK_BASE_URL() {
    return process.env.NEXT_PUBLIC_ASAAS_CALLBACK_BASE_URL?.trim() || null
  },
}

// ============================================================================
// Variáveis de ambiente privadas (server-only)
// NUNCA devem ser usadas no cliente
// IMPORTANTE: Essas variáveis NÃO são expostas no bundle do cliente
// ============================================================================

export const serverEnv = {
  get DATABASE_URL() {
    return validateRequiredEnv('DATABASE_URL', process.env.DATABASE_URL)
  },

  // Pagar.me (privado)
  get PAGARME_SECRET_KEY() {
    return validateRequiredEnv('PAGARME_SECRET_KEY', process.env.PAGARME_SECRET_KEY)
  },
  get PAGARME_WEBHOOK_USER() {
    const v = process.env.PAGARME_WEBHOOK_USER
    if (process.env.NODE_ENV === 'production') {
      return validateRequiredEnv('PAGARME_WEBHOOK_USER', v)
    }
    return v
  },
  get PAGARME_WEBHOOK_SECRET() {
    const v = process.env.PAGARME_WEBHOOK_SECRET
    if (process.env.NODE_ENV === 'production') {
      return validateRequiredEnv('PAGARME_WEBHOOK_SECRET', v)
    }
    return v
  },
  get PAGARME_ENVIRONMENT() {
    return (process.env.PAGARME_ENVIRONMENT || 'production') as 'sandbox' | 'production'
  },

  // Asaas (privado)
  get ASAAS_API_KEY() {
    return validateRequiredEnv('ASAAS_API_KEY', process.env.ASAAS_API_KEY)
  },
  get ASAAS_WEBHOOK_SECRET() {
    const v = process.env.ASAAS_WEBHOOK_SECRET
    if (process.env.NODE_ENV === 'production') {
      return validateRequiredEnv('ASAAS_WEBHOOK_SECRET', v)
    }
    return v
  },
  get ASAAS_ENVIRONMENT() {
    return (process.env.ASAAS_ENVIRONMENT || 'production') as 'sandbox' | 'production'
  },

  // Email/SMTP (privado)
  get SMTP_HOST() {
    return process.env.SMTP_HOST
  },
  get SMTP_PORT() {
    return process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  },
  get SMTP_USER() {
    return process.env.SMTP_USER
  },
  /** Remetente alternativo quando SMTP_USER não é o endereço From desejado */
  get EMAIL_FROM() {
    return process.env.EMAIL_FROM
  },
  get EMAIL_FROM_NAME() {
    const explicit = process.env.EMAIL_FROM_NAME?.trim()
    if (explicit) return explicit
    return parseBrandConfig(process.env).name
  },
  /** E-mail promovido a admin no login. Ausente ou inválido não promove ninguém. */
  get ADMIN_EMAIL() {
    const value = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    return value && value.includes('@') ? value : null
  },
  get ACCESS_CODE_SECRET() {
    return validateRequiredEnv('ACCESS_CODE_SECRET', process.env.ACCESS_CODE_SECRET)
  },
  get SMTP_PASS() {
    return process.env.SMTP_PASS
  },
  get SMTP_SECURE() {
    return process.env.SMTP_SECURE === 'true'
  },
  get SMTP_TEST_MODE() {
    return process.env.SMTP_TEST_MODE === 'true'
  },
  get INBUCKET_SMTP_HOST() {
    return process.env.INBUCKET_SMTP_HOST || 'localhost'
  },
  get INBUCKET_SMTP_PORT() {
    return process.env.INBUCKET_SMTP_PORT ? parseInt(process.env.INBUCKET_SMTP_PORT, 10) : 54325
  },
  get INBUCKET_WEB_PORT() {
    return process.env.INBUCKET_WEB_PORT ? parseInt(process.env.INBUCKET_WEB_PORT, 10) : 54334
  },

  // Google Gemini (IA para geração de produtos)
  get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY
  },

  // Ambiente e build
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development'
  },
}
