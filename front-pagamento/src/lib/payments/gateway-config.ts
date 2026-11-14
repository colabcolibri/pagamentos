import 'server-only'

import { createTtlCache } from '@/lib/cache/ttl-cache'
import { serverEnv } from '@/lib/config/env'
import { getPool } from '@/lib/db/pool'
import { decryptStoredSecret } from '@/lib/security/secret-box'

export type SecretSource = 'env' | 'database' | 'missing'
export type GatewayEnvironment = 'sandbox' | 'production'

export type SecretStatus = {
  configured: boolean
  source: SecretSource
  preview: string | null
}

type SettingsRow = {
  sale_notification_recipients: string | null
  asaas_enabled: boolean
  pagarme_enabled: boolean
  asaas_api_key: string | null
  asaas_webhook_secret: string | null
  asaas_environment: string | null
  pagarme_secret_key: string | null
  pagarme_webhook_user: string | null
  pagarme_webhook_secret: string | null
  pagarme_environment: string | null
  gemini_api_key: string | null
  deepinfra_api_key: string | null
  products_by_price_api_key: string | null
}

export type GatewayConfig = {
  saleNotificationRecipients: string | null
  asaasEnabled: boolean
  pagarmeEnabled: boolean
  asaasApiKey: string | null
  asaasApiKeySource: SecretSource
  asaasWebhookSecret: string | null
  asaasWebhookSecretSource: SecretSource
  asaasEnvironment: GatewayEnvironment
  asaasEnvironmentSource: SecretSource
  pagarmeSecretKey: string | null
  pagarmeSecretKeySource: SecretSource
  pagarmeWebhookUser: string | null
  pagarmeWebhookUserSource: SecretSource
  pagarmeWebhookSecret: string | null
  pagarmeWebhookSecretSource: SecretSource
  pagarmeEnvironment: GatewayEnvironment
  pagarmeEnvironmentSource: SecretSource
  geminiApiKey: string | null
  geminiApiKeySource: SecretSource
  deepinfraApiKey: string | null
  deepinfraApiKeySource: SecretSource
  productsByPriceApiKey: string | null
  productsByPriceApiKeySource: SecretSource
}

export type AdminGatewayView = {
  sale_notification_recipients: string | null
  asaas_enabled: boolean
  pagarme_enabled: boolean
  asaas_environment: GatewayEnvironment
  pagarme_environment: GatewayEnvironment
  asaas_environment_source: SecretSource
  pagarme_environment_source: SecretSource
  asaas_api_key: SecretStatus
  asaas_webhook_secret: SecretStatus
  pagarme_secret_key: SecretStatus
  pagarme_webhook_user: SecretStatus
  pagarme_webhook_secret: SecretStatus
  gemini_api_key: SecretStatus
  deepinfra_api_key: SecretStatus
  products_by_price_api_key: SecretStatus
}

export function chooseSecret(
  fromEnv: string | null | undefined,
  stored: string | null | undefined
): { value: string | null; source: SecretSource } {
  const envValue = fromEnv?.trim()
  if (envValue) return { value: envValue, source: 'env' }
  const storedValue = decryptStoredSecret(stored)
  if (storedValue) return { value: storedValue, source: 'database' }
  return { value: null, source: 'missing' }
}

function readEnv(name: string): string | null {
  const fromProcess = process.env[name]?.trim()
  if (fromProcess) return fromProcess
  try {
    const fromServerEnv = (serverEnv as Record<string, unknown>)[name]
    if (typeof fromServerEnv === 'string' && fromServerEnv.trim()) {
      return fromServerEnv.trim()
    }
  } catch {
    // ignore missing required env getter during unit tests
  }
  return null
}

function readEnvironment(name: string): GatewayEnvironment | null {
  const value = readEnv(name)
  if (value === 'sandbox' || value === 'production') return value
  return null
}

function storedEnvironment(value: string | null | undefined): GatewayEnvironment | null {
  if (value === 'sandbox' || value === 'production') return value
  return null
}

export function maskSecret(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (trimmed.length < 8) return '••••••••'
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`
}

function secretStatus(value: string | null, source: SecretSource): SecretStatus {
  return {
    configured: Boolean(value),
    source,
    preview: maskSecret(value),
  }
}

export function toAdminGatewayView(config: GatewayConfig): AdminGatewayView {
  return {
    sale_notification_recipients: config.saleNotificationRecipients,
    asaas_enabled: config.asaasEnabled,
    pagarme_enabled: config.pagarmeEnabled,
    asaas_environment: config.asaasEnvironment,
    pagarme_environment: config.pagarmeEnvironment,
    asaas_environment_source: config.asaasEnvironmentSource,
    pagarme_environment_source: config.pagarmeEnvironmentSource,
    asaas_api_key: secretStatus(config.asaasApiKey, config.asaasApiKeySource),
    asaas_webhook_secret: secretStatus(config.asaasWebhookSecret, config.asaasWebhookSecretSource),
    pagarme_secret_key: secretStatus(config.pagarmeSecretKey, config.pagarmeSecretKeySource),
    pagarme_webhook_user: secretStatus(config.pagarmeWebhookUser, config.pagarmeWebhookUserSource),
    pagarme_webhook_secret: secretStatus(
      config.pagarmeWebhookSecret,
      config.pagarmeWebhookSecretSource
    ),
    gemini_api_key: secretStatus(config.geminiApiKey, config.geminiApiKeySource),
    deepinfra_api_key: secretStatus(config.deepinfraApiKey, config.deepinfraApiKeySource),
    products_by_price_api_key: secretStatus(
      config.productsByPriceApiKey,
      config.productsByPriceApiKeySource
    ),
  }
}

export function inactiveGatewayMessage(
  config: GatewayConfig,
  gateway: 'asaas' | 'pagarme'
): string | null {
  const available = publicGatewayAvailability(config)
  if (available[gateway]) return null
  return gateway === 'asaas' ? 'Asaas não está ativo.' : 'Pagar.me não está ativo.'
}

export function publicGatewayAvailability(config: GatewayConfig): {
  asaas: boolean
  pagarme: boolean
} {
  return {
    asaas: config.asaasEnabled && Boolean(config.asaasApiKey),
    pagarme: config.pagarmeEnabled && Boolean(config.pagarmeSecretKey),
  }
}

const GATEWAY_CONFIG_TTL_MS = 30_000

async function fetchGatewayConfig(): Promise<GatewayConfig> {
  let row: SettingsRow | undefined
  try {
    const data = await getPool().query<SettingsRow>(
      `SELECT sale_notification_recipients, asaas_enabled, pagarme_enabled,
              asaas_api_key, asaas_webhook_secret, asaas_environment,
              pagarme_secret_key, pagarme_webhook_user, pagarme_webhook_secret, pagarme_environment,
              gemini_api_key, deepinfra_api_key, products_by_price_api_key
       FROM payments.platform_settings
       ORDER BY id
       LIMIT 1`
    )
    row = data.rows[0]
  } catch {
    row = undefined
  }
  const asaasKey = chooseSecret(readEnv('ASAAS_API_KEY'), row?.asaas_api_key)
  const asaasWebhook = chooseSecret(readEnv('ASAAS_WEBHOOK_SECRET'), row?.asaas_webhook_secret)
  const pagarmeKey = chooseSecret(readEnv('PAGARME_SECRET_KEY'), row?.pagarme_secret_key)
  const pagarmeUser = chooseSecret(readEnv('PAGARME_WEBHOOK_USER'), row?.pagarme_webhook_user)
  const pagarmeWebhook = chooseSecret(
    readEnv('PAGARME_WEBHOOK_SECRET'),
    row?.pagarme_webhook_secret
  )
  const gemini = chooseSecret(readEnv('GEMINI_API_KEY'), row?.gemini_api_key)
  const deepinfra = chooseSecret(readEnv('DEEPINFRA_API_KEY'), row?.deepinfra_api_key)
  const productsByPrice = chooseSecret(
    readEnv('PRODUCTS_BY_PRICE_API_KEY'),
    row?.products_by_price_api_key
  )
  const asaasEnv = readEnvironment('ASAAS_ENVIRONMENT')
  const pagarmeEnv = readEnvironment('PAGARME_ENVIRONMENT')
  const storedAsaasEnv = storedEnvironment(row?.asaas_environment)
  const storedPagarmeEnv = storedEnvironment(row?.pagarme_environment)

  return {
    saleNotificationRecipients: row?.sale_notification_recipients ?? null,
    asaasEnabled: row?.asaas_enabled ?? true,
    pagarmeEnabled: row?.pagarme_enabled ?? true,
    asaasApiKey: asaasKey.value,
    asaasApiKeySource: asaasKey.source,
    asaasWebhookSecret: asaasWebhook.value,
    asaasWebhookSecretSource: asaasWebhook.source,
    asaasEnvironment: asaasEnv ?? storedAsaasEnv ?? 'production',
    asaasEnvironmentSource: asaasEnv ? 'env' : storedAsaasEnv ? 'database' : 'missing',
    pagarmeSecretKey: pagarmeKey.value,
    pagarmeSecretKeySource: pagarmeKey.source,
    pagarmeWebhookUser: pagarmeUser.value,
    pagarmeWebhookUserSource: pagarmeUser.source,
    pagarmeWebhookSecret: pagarmeWebhook.value,
    pagarmeWebhookSecretSource: pagarmeWebhook.source,
    pagarmeEnvironment: pagarmeEnv ?? storedPagarmeEnv ?? 'production',
    pagarmeEnvironmentSource: pagarmeEnv ? 'env' : storedPagarmeEnv ? 'database' : 'missing',
    geminiApiKey: gemini.value,
    geminiApiKeySource: gemini.source,
    deepinfraApiKey: deepinfra.value,
    deepinfraApiKeySource: deepinfra.source,
    productsByPriceApiKey: productsByPrice.value,
    productsByPriceApiKeySource: productsByPrice.source,
  }
}

const gatewayConfigCache = createTtlCache(GATEWAY_CONFIG_TTL_MS, fetchGatewayConfig)

export function loadGatewayConfig(): Promise<GatewayConfig> {
  return gatewayConfigCache.get()
}

export function invalidateGatewayConfigCache(): void {
  gatewayConfigCache.invalidate()
}
