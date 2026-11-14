import { z } from 'zod'

import { getPool } from '@/lib/db/pool'
import {
  invalidateGatewayConfigCache,
  loadGatewayConfig,
  toAdminGatewayView,
} from '@/lib/payments/gateway-config'
import { encryptStoredSecret } from '@/lib/security/secret-box'

export const platformSettingsPatchSchema = z.object({
  sale_notification_recipients: z.union([z.string().max(4000), z.null()]).optional(),
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
  }
  return toAdminGatewayView(await loadGatewayConfig())
}
