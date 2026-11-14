import type { EmailDispatchOptions, SmtpOverrides } from '@quitou/core/email'
import 'server-only'

import { type BrandConfig, parseBrandConfig } from '@/lib/brand/brand-config'
import { loadBrandConfig } from '@/lib/brand/load-brand-config'
import { computeLogoVersion } from '@/lib/brand/logo-upload'
import { createTtlCache } from '@/lib/cache/ttl-cache'
import { getPool } from '@/lib/db/pool'
import { type SecretSource, type SecretStatus, maskSecret } from '@/lib/payments/gateway-config'
import { decryptStoredSecret } from '@/lib/security/secret-box'

type InstanceSettingsRow = {
  brand_name: string | null
  brand_tagline: string | null
  brand_logo_mime: string | null
  brand_logo_base64: string | null
  brand_copyright_name: string | null
  brand_legal_name: string | null
  brand_cnpj: string | null
  brand_support_email: string | null
  brand_contact_email: string | null
  brand_privacy_url: string | null
  brand_terms_url: string | null
  email_footer_text: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean | null
  smtp_user: string | null
  smtp_pass: string | null
  email_from: string | null
  email_from_name: string | null
}

export type SmtpRuntimeConfig = {
  host: string | null
  hostSource: SecretSource
  port: number
  secure: boolean
  user: string | null
  userSource: SecretSource
  pass: string | null
  passSource: SecretSource
  emailFrom: string | null
  emailFromSource: SecretSource
  emailFromName: string
  emailFooterText: string | null
}

export type InstanceConfig = {
  brand: BrandConfig
  hasCustomLogo: boolean
  logoMime: string | null
  logoBase64: string | null
  smtp: SmtpRuntimeConfig
}

export type AdminInstanceView = {
  brand_name: string
  brand_tagline: string
  brand_copyright_name: string
  brand_legal_name: string | null
  brand_cnpj: string | null
  brand_support_email: string | null
  brand_contact_email: string | null
  brand_privacy_url: string | null
  brand_terms_url: string | null
  has_custom_logo: boolean
  logo_src: string | null
  email_footer_text: string | null
  smtp_host: string | null
  smtp_host_source: SecretSource
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string | null
  smtp_pass: SecretStatus
  email_from: string | null
  email_from_source: SecretSource
  email_from_name: string
}

function pickString(
  dbValue: string | null | undefined,
  envValue: string | undefined
): { value: string | null; source: SecretSource } {
  const dbClean = dbValue?.trim()
  if (dbClean) return { value: dbClean, source: 'database' }
  const envClean = envValue?.trim()
  if (envClean) return { value: envClean, source: 'env' }
  return { value: null, source: 'missing' }
}

async function fetchInstanceConfig(): Promise<InstanceConfig> {
  let row: InstanceSettingsRow | undefined
  try {
    const data = await getPool().query<InstanceSettingsRow>(
      `SELECT brand_name, brand_tagline, brand_logo_mime, brand_logo_base64,
              brand_copyright_name, brand_legal_name, brand_cnpj,
              brand_support_email, brand_contact_email, brand_privacy_url, brand_terms_url,
              email_footer_text, smtp_host, smtp_port, smtp_secure,
              smtp_user, smtp_pass, email_from, email_from_name
       FROM payments.platform_settings
       ORDER BY id
       LIMIT 1`
    )
    row = data.rows[0]
  } catch {
    row = undefined
  }

  const fileBrand = loadBrandConfig()
  const mergedBrand = parseBrandConfig({
    BRAND_NAME: row?.brand_name ?? process.env.BRAND_NAME,
    BRAND_TAGLINE: row?.brand_tagline ?? process.env.BRAND_TAGLINE,
    BRAND_LOGO_SRC: process.env.BRAND_LOGO_SRC,
    BRAND_COPYRIGHT_NAME: row?.brand_copyright_name ?? process.env.BRAND_COPYRIGHT_NAME,
    BRAND_LEGAL_NAME: row?.brand_legal_name ?? process.env.BRAND_LEGAL_NAME,
    BRAND_CNPJ: row?.brand_cnpj ?? process.env.BRAND_CNPJ,
    BRAND_SUPPORT_EMAIL: row?.brand_support_email ?? process.env.BRAND_SUPPORT_EMAIL,
    BRAND_CONTACT_EMAIL: row?.brand_contact_email ?? process.env.BRAND_CONTACT_EMAIL,
    BRAND_PRIVACY_URL: row?.brand_privacy_url ?? process.env.BRAND_PRIVACY_URL,
    BRAND_TERMS_URL: row?.brand_terms_url ?? process.env.BRAND_TERMS_URL,
  })

  const hasCustomLogo = Boolean(row?.brand_logo_mime && row?.brand_logo_base64)
  const logoVersion = hasCustomLogo ? computeLogoVersion(row?.brand_logo_base64) : null
  const logoSrc = hasCustomLogo ? `/api/brand/logo?v=${logoVersion}` : fileBrand.logoSrc

  const brand: BrandConfig = {
    ...mergedBrand,
    logoSrc,
  }

  const smtpHost = pickString(row?.smtp_host, process.env.SMTP_HOST)
  const smtpUser = pickString(row?.smtp_user, process.env.SMTP_USER)
  const decryptedDbPass = decryptStoredSecret(row?.smtp_pass)
  const smtpPass = pickString(decryptedDbPass, process.env.SMTP_PASS)
  const emailFrom = pickString(row?.email_from, process.env.EMAIL_FROM)

  const envPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const smtpPort =
    typeof row?.smtp_port === 'number' && Number.isFinite(row.smtp_port)
      ? row.smtp_port
      : Number.isFinite(envPort)
        ? envPort
        : 587

  const smtpSecure =
    typeof row?.smtp_secure === 'boolean' ? row.smtp_secure : process.env.SMTP_SECURE === 'true'

  const emailFromName =
    row?.email_from_name?.trim() || process.env.EMAIL_FROM_NAME?.trim() || brand.name

  return {
    brand,
    hasCustomLogo,
    logoMime: hasCustomLogo ? (row?.brand_logo_mime ?? null) : null,
    logoBase64: hasCustomLogo ? (row?.brand_logo_base64 ?? null) : null,
    smtp: {
      host: smtpHost.value,
      hostSource: smtpHost.source,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser.value,
      userSource: smtpUser.source,
      pass: smtpPass.value,
      passSource: smtpPass.source,
      emailFrom: emailFrom.value,
      emailFromSource: emailFrom.source,
      emailFromName,
      emailFooterText: row?.email_footer_text?.trim() || null,
    },
  }
}

const INSTANCE_CONFIG_TTL_MS = 30_000
const instanceConfigCache = createTtlCache(INSTANCE_CONFIG_TTL_MS, fetchInstanceConfig)

export function loadInstanceConfig(): Promise<InstanceConfig> {
  return instanceConfigCache.get()
}

export function invalidateInstanceConfigCache(): void {
  instanceConfigCache.invalidate()
}

export async function loadRuntimeBrandConfig(): Promise<BrandConfig> {
  return (await loadInstanceConfig()).brand
}

export function toSmtpOverrides(config: InstanceConfig): SmtpOverrides {
  return {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    user: config.smtp.user,
    pass: config.smtp.pass,
  }
}

export function toEmailDispatchOptions(config: InstanceConfig): EmailDispatchOptions {
  return {
    brandName: config.brand.name,
    footerText: config.smtp.emailFooterText,
    companyLine: config.brand.companyLine,
    fromEmail: config.smtp.emailFrom || config.smtp.user,
    fromName: config.smtp.emailFromName,
    smtp: toSmtpOverrides(config),
  }
}

export function toAdminInstanceView(config: InstanceConfig): AdminInstanceView {
  return {
    brand_name: config.brand.name,
    brand_tagline: config.brand.tagline,
    brand_copyright_name: config.brand.copyrightName,
    brand_legal_name: config.brand.legalName,
    brand_cnpj: config.brand.cnpj,
    brand_support_email: config.brand.supportEmail,
    brand_contact_email: config.brand.contactEmail,
    brand_privacy_url: config.brand.privacyUrl,
    brand_terms_url: config.brand.termsUrl,
    has_custom_logo: config.hasCustomLogo,
    logo_src: config.brand.logoSrc,
    email_footer_text: config.smtp.emailFooterText,
    smtp_host: config.smtp.host,
    smtp_host_source: config.smtp.hostSource,
    smtp_port: config.smtp.port,
    smtp_secure: config.smtp.secure,
    smtp_user: config.smtp.user,
    smtp_pass: {
      configured: Boolean(config.smtp.pass),
      source: config.smtp.passSource,
      preview: maskSecret(config.smtp.pass),
    },
    email_from: config.smtp.emailFrom,
    email_from_source: config.smtp.emailFromSource,
    email_from_name: config.smtp.emailFromName,
  }
}
