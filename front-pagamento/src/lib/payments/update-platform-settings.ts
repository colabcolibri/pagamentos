import { z } from 'zod'

import { validateAndNormalizeLogo } from '@/lib/brand/logo-upload'
import { getPool } from '@/lib/db/pool'
import {
  invalidateGatewayConfigCache,
  loadGatewayConfig,
  toAdminGatewayView,
} from '@/lib/payments/gateway-config'
import {
  invalidateInstanceConfigCache,
  loadInstanceConfig,
  toAdminInstanceView,
} from '@/lib/platform/instance-config'
import { encryptStoredSecret } from '@/lib/security/secret-box'

const optionalNullableText = (max: number) => z.union([z.string().max(max), z.null()]).optional()

export const platformSettingsPatchSchema = z.object({
  sale_notification_recipients: optionalNullableText(4000),
  asaas_enabled: z.boolean().optional(),
  pagarme_enabled: z.boolean().optional(),
  asaas_environment: z.enum(['sandbox', 'production']).optional(),
  pagarme_environment: z.enum(['sandbox', 'production']).optional(),
  asaas_api_key: z.string().max(500).optional(),
  asaas_webhook_secret: z.string().max(500).optional(),
  pagarme_secret_key: z.string().max(500).optional(),
  pagarme_webhook_user: z.string().max(200).optional(),
  pagarme_webhook_secret: z.string().max(500).optional(),
  gemini_api_key: z.string().max(500).optional(),
  deepinfra_api_key: z.string().max(500).optional(),
  products_by_price_api_key: z.string().max(500).optional(),
  brand_name: optionalNullableText(120),
  brand_tagline: optionalNullableText(280),
  brand_copyright_name: optionalNullableText(120),
  brand_legal_name: optionalNullableText(200),
  brand_cnpj: optionalNullableText(32),
  brand_support_email: optionalNullableText(200),
  brand_contact_email: optionalNullableText(200),
  brand_privacy_url: optionalNullableText(500),
  brand_terms_url: optionalNullableText(500),
  brand_logo_mime: z.string().max(64).optional(),
  brand_logo_base64: z.string().max(800_000).optional(),
  brand_logo_clear: z.boolean().optional(),
  email_footer_text: optionalNullableText(500),
  smtp_host: optionalNullableText(255),
  smtp_port: z.union([z.number().int().min(1).max(65535), z.null()]).optional(),
  smtp_secure: z.union([z.boolean(), z.null()]).optional(),
  smtp_user: optionalNullableText(255),
  smtp_pass: z.string().max(500).optional(),
  email_from: optionalNullableText(255),
  email_from_name: optionalNullableText(120),
})

export type PlatformSettingsPatch = z.infer<typeof platformSettingsPatchSchema>

function parseRecipientList(raw: string): string[] {
  return raw
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

function validateRecipientsCsv(
  raw: string | null | undefined
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null || !String(raw).trim()) return { ok: true, value: null }
  const emails = parseRecipientList(String(raw))
  for (const email of emails) {
    if (!z.string().email().safeParse(email).success) {
      return { ok: false, message: `E-mail inválido: ${email}` }
    }
  }
  return { ok: true, value: emails.join(', ') }
}

export async function updatePlatformSettings(data: PlatformSettingsPatch) {
  const sets: string[] = []
  const values: unknown[] = []
  const add = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }
  const addSecret = (column: string, value: string | undefined) => {
    if (value === undefined) return
    const trimmed = value.trim()
    if (!trimmed) return
    add(column, encryptStoredSecret(trimmed))
  }

  if (data.sale_notification_recipients !== undefined) {
    const validated = validateRecipientsCsv(data.sale_notification_recipients)
    if (!validated.ok) throw new Error(validated.message)
    add('sale_notification_recipients', validated.value)
  }
  if (data.asaas_enabled !== undefined) add('asaas_enabled', data.asaas_enabled)
  if (data.pagarme_enabled !== undefined) add('pagarme_enabled', data.pagarme_enabled)
  if (data.asaas_environment !== undefined) add('asaas_environment', data.asaas_environment)
  if (data.pagarme_environment !== undefined) add('pagarme_environment', data.pagarme_environment)
  addSecret('asaas_api_key', data.asaas_api_key)
  addSecret('asaas_webhook_secret', data.asaas_webhook_secret)
  addSecret('pagarme_secret_key', data.pagarme_secret_key)
  addSecret('pagarme_webhook_user', data.pagarme_webhook_user)
  addSecret('pagarme_webhook_secret', data.pagarme_webhook_secret)
  addSecret('gemini_api_key', data.gemini_api_key)
  addSecret('deepinfra_api_key', data.deepinfra_api_key)
  addSecret('products_by_price_api_key', data.products_by_price_api_key)

  const addOptionalText = (column: string, value: string | null | undefined) => {
    if (value === undefined) return
    const trimmed = value === null ? '' : value.trim()
    add(column, trimmed ? trimmed : null)
  }

  const addOptionalEmail = (column: string, label: string, value: string | null | undefined) => {
    if (value === undefined) return
    const trimmed = value === null ? '' : value.trim()
    if (trimmed && !z.string().email().safeParse(trimmed).success) {
      throw new Error(`${label} inválido: ${trimmed}`)
    }
    add(column, trimmed ? trimmed : null)
  }

  addOptionalText('brand_name', data.brand_name)
  addOptionalText('brand_tagline', data.brand_tagline)
  addOptionalText('brand_copyright_name', data.brand_copyright_name)
  addOptionalText('brand_legal_name', data.brand_legal_name)
  addOptionalText('brand_cnpj', data.brand_cnpj)
  addOptionalEmail('brand_support_email', 'E-mail de suporte', data.brand_support_email)
  addOptionalEmail('brand_contact_email', 'E-mail de contato', data.brand_contact_email)
  addOptionalText('brand_privacy_url', data.brand_privacy_url)
  addOptionalText('brand_terms_url', data.brand_terms_url)
  addOptionalText('email_footer_text', data.email_footer_text)
  addOptionalText('smtp_host', data.smtp_host)
  if (data.smtp_port !== undefined) add('smtp_port', data.smtp_port)
  if (data.smtp_secure !== undefined) add('smtp_secure', data.smtp_secure)
  addOptionalText('smtp_user', data.smtp_user)
  addSecret('smtp_pass', data.smtp_pass)
  addOptionalEmail('email_from', 'E-mail remetente', data.email_from)
  addOptionalText('email_from_name', data.email_from_name)

  if (data.brand_logo_clear) {
    add('brand_logo_mime', null)
    add('brand_logo_base64', null)
  } else if (data.brand_logo_base64 !== undefined || data.brand_logo_mime !== undefined) {
    if (!data.brand_logo_base64 || !data.brand_logo_mime) {
      throw new Error('Envie o tipo e o arquivo da logo juntos.')
    }
    const normalized = validateAndNormalizeLogo({
      mime: data.brand_logo_mime,
      base64: data.brand_logo_base64,
    })
    if (!normalized.ok) {
      throw new Error(normalized.message)
    }
    add('brand_logo_mime', normalized.mime)
    add('brand_logo_base64', normalized.base64)
  }

  if (sets.length > 0) {
    await getPool().query(
      'INSERT INTO payments.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING'
    )
    values.push(1)
    await getPool().query(
      `UPDATE payments.platform_settings
       SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${values.length}`,
      values
    )
    invalidateGatewayConfigCache()
    invalidateInstanceConfigCache()
  }
  const [gateway, instance] = await Promise.all([loadGatewayConfig(), loadInstanceConfig()])
  return {
    ...toAdminGatewayView(gateway),
    ...toAdminInstanceView(instance),
  }
}
