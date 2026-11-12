/**
 * Testes de conexão para APIs e webhooks (admin only)
 * Nunca expõe chaves ou dados sensíveis nas respostas
 */
import 'server-only'

import { getPool } from '@/lib/db/pool'
import { getLogger } from '@/lib/logger'
import { loadGatewayConfig } from '@/lib/payments/gateway-config'

export type ConnectionStatus = 'ok' | 'error' | 'skipped'

export interface ConnectionResult {
  id: string
  name: string
  status: ConnectionStatus
  message: string
  configured?: boolean
}

export function redactConnectionMessage(message: string): string {
  return message.replace(/([?&]key=)[^&\s]+/gi, '$1***').replace(/Bearer\s+\S+/gi, 'Bearer ***')
}

function sanitizeError(error: unknown): string {
  const msg = redactConnectionMessage(error instanceof Error ? error.message : String(error))
  if (msg.toLowerCase().includes('api') && msg.toLowerCase().includes('key')) {
    return 'Chave de API inválida ou expirada. Confira se a chave corresponde ao ambiente (PAGARME_ENVIRONMENT/ASAAS_ENVIRONMENT: production ou sandbox).'
  }
  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Chave de API inválida ou expirada. Confira se a chave corresponde ao ambiente (PAGARME_ENVIRONMENT/ASAAS_ENVIRONMENT: production ou sandbox).'
  }
  if (msg.includes('403') || msg.includes('Forbidden')) {
    return 'Acesso negado'
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
    return 'Timeout ou serviço indisponível'
  }
  if (msg.length > 100) {
    return msg.substring(0, 97) + '...'
  }
  return msg
}

export async function testDatabaseConnection(): Promise<ConnectionResult> {
  try {
    await getPool().query('SELECT id FROM payments.products LIMIT 1')
    return {
      id: 'postgres',
      name: 'Postgres',
      status: 'ok',
      message: 'Conexão estabelecida',
    }
  } catch (error) {
    getLogger().error('Postgres connection test error', { error })
    return {
      id: 'postgres',
      name: 'Postgres',
      status: 'error',
      message: sanitizeError(error),
    }
  }
}

export async function testPagarmeConnection(): Promise<ConnectionResult> {
  const config = await loadGatewayConfig()
  if (!config.pagarmeEnabled) {
    return {
      id: 'pagarme',
      name: 'Pagar.me',
      status: 'skipped',
      message: 'Desativado',
      configured: false,
    }
  }
  if (!config.pagarmeSecretKey) {
    return {
      id: 'pagarme',
      name: 'Pagar.me',
      status: 'skipped',
      message: 'Não configurado',
      configured: false,
    }
  }
  try {
    const baseUrl =
      config.pagarmeEnvironment === 'production'
        ? 'https://api.pagar.me/core/v5'
        : 'https://sdx-api.pagar.me/core/v5'
    const authHeader = `Basic ${Buffer.from(config.pagarmeSecretKey + ':').toString('base64')}`

    const response = await fetch(`${baseUrl}/paymentlinks?page=1&size=1`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: authHeader,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const err = new Error(`HTTP ${response.status}: ${errorBody}`)
      return {
        id: 'pagarme',
        name: 'Pagar.me',
        status: 'error',
        message: sanitizeError(err),
      }
    }

    return {
      id: 'pagarme',
      name: 'Pagar.me',
      status: 'ok',
      message: `Conexão estabelecida (${config.pagarmeEnvironment})`,
    }
  } catch (error) {
    getLogger().error('Pagar.me connection test error', { error })
    return {
      id: 'pagarme',
      name: 'Pagar.me',
      status: 'error',
      message: sanitizeError(error),
    }
  }
}

export async function testAsaasConnection(): Promise<ConnectionResult> {
  const config = await loadGatewayConfig()
  if (!config.asaasEnabled) {
    return {
      id: 'asaas',
      name: 'Asaas',
      status: 'skipped',
      message: 'Desativado',
      configured: false,
    }
  }
  if (!config.asaasApiKey) {
    return {
      id: 'asaas',
      name: 'Asaas',
      status: 'skipped',
      message: 'Não configurado',
      configured: false,
    }
  }
  try {
    const baseUrl =
      config.asaasEnvironment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'
    const apiKey = config.asaasApiKey.startsWith('$')
      ? config.asaasApiKey
      : `$${config.asaasApiKey}`

    const response = await fetch(`${baseUrl}/customers?limit=1`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const err = new Error(`HTTP ${response.status}: ${errorBody}`)
      return {
        id: 'asaas',
        name: 'Asaas',
        status: 'error',
        message: sanitizeError(err),
      }
    }

    return {
      id: 'asaas',
      name: 'Asaas',
      status: 'ok',
      message: `Conexão estabelecida (${config.asaasEnvironment})`,
    }
  } catch (error) {
    getLogger().error('Asaas connection test error', { error })
    return {
      id: 'asaas',
      name: 'Asaas',
      status: 'error',
      message: sanitizeError(error),
    }
  }
}

export async function testGeminiConnection(): Promise<ConnectionResult> {
  const apiKey = (await loadGatewayConfig()).geminiApiKey
  if (!apiKey?.trim()) {
    return {
      id: 'gemini',
      name: 'Gemini (IA)',
      status: 'skipped',
      message: 'Não configurado (opcional)',
      configured: false,
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`)
      return {
        id: 'gemini',
        name: 'Gemini (IA)',
        status: 'error',
        message: sanitizeError(err),
        configured: true,
      }
    }

    return {
      id: 'gemini',
      name: 'Gemini (IA)',
      status: 'ok',
      message: 'Conexão estabelecida',
      configured: true,
    }
  } catch (error) {
    getLogger().error('Gemini connection test error', { error })
    return {
      id: 'gemini',
      name: 'Gemini (IA)',
      status: 'error',
      message: sanitizeError(error),
      configured: true,
    }
  }
}

export async function getWebhookConfigStatus(): Promise<ConnectionResult[]> {
  const config = await loadGatewayConfig()
  const pagarmeReady = Boolean(config.pagarmeWebhookUser && config.pagarmeWebhookSecret)
  const asaasReady = Boolean(config.asaasWebhookSecret)

  return [
    {
      id: 'webhook-pagarme',
      name: 'Webhook Pagar.me',
      status: pagarmeReady ? 'ok' : 'error',
      message: pagarmeReady
        ? 'Credenciais configuradas'
        : 'Informe o usuário e o segredo do webhook',
      configured: pagarmeReady,
    },
    {
      id: 'webhook-asaas',
      name: 'Webhook Asaas',
      status: asaasReady ? 'ok' : 'error',
      message: asaasReady ? 'Token configurado' : 'Informe o token do webhook',
      configured: asaasReady,
    },
  ]
}

export async function runAllConnectionTests(): Promise<ConnectionResult[]> {
  const [database, pagarme, asaas, gemini] = await Promise.all([
    testDatabaseConnection(),
    testPagarmeConnection(),
    testAsaasConnection(),
    testGeminiConnection(),
  ])

  const webhooks = await getWebhookConfigStatus()

  return [database, pagarme, asaas, gemini, ...webhooks]
}
