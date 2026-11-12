export type BrandLink = {
  label: string
  href: string
}

export type BrandConfig = {
  name: string
  tagline: string
  logoSrc: string | null
  copyrightName: string
  legalName: string | null
  cnpj: string | null
  supportEmail: string | null
  contactEmail: string | null
  privacyUrl: string | null
  termsUrl: string | null
  companyLine: string | null
  links: BrandLink[]
}

const PRODUCT_NAME = 'Quitou'
const DEFAULT_TAGLINE = 'Pague com Pix, boleto ou cartão e acompanhe seus pedidos.'

type EnvMap = Record<string, string | undefined>

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Caminho público. Recusa vazio, URL absoluta e qualquer `..`. */
export function safePublicLogoPath(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('..') || trimmed.includes('\\')) return null
  return trimmed
}

function companyLine(legalName: string | null, cnpj: string | null): string | null {
  if (legalName && cnpj) return `${legalName} — CNPJ ${cnpj}`
  if (legalName) return legalName
  if (cnpj) return `CNPJ ${cnpj}`
  return null
}

/**
 * Marca da instância a partir do ambiente. Não lê disco.
 * Nome ausente cai no nome do produto.
 */
export function parseBrandConfig(env: EnvMap): BrandConfig {
  const name = clean(env.BRAND_NAME) ?? PRODUCT_NAME
  const legalName = clean(env.BRAND_LEGAL_NAME)
  const cnpj = clean(env.BRAND_CNPJ)
  const privacyUrl = clean(env.BRAND_PRIVACY_URL)
  const termsUrl = clean(env.BRAND_TERMS_URL)
  const supportEmail = clean(env.BRAND_SUPPORT_EMAIL)

  const links: BrandLink[] = []
  if (privacyUrl) links.push({ label: 'Política de privacidade', href: privacyUrl })
  if (termsUrl) links.push({ label: 'Termos de uso', href: termsUrl })
  if (supportEmail) links.push({ label: 'Suporte por e-mail', href: `mailto:${supportEmail}` })

  return {
    name,
    tagline: clean(env.BRAND_TAGLINE) ?? DEFAULT_TAGLINE,
    logoSrc: safePublicLogoPath(env.BRAND_LOGO_SRC),
    copyrightName: clean(env.BRAND_COPYRIGHT_NAME) ?? name,
    legalName,
    cnpj,
    supportEmail,
    contactEmail: clean(env.BRAND_CONTACT_EMAIL),
    privacyUrl,
    termsUrl,
    companyLine: companyLine(legalName, cnpj),
    links,
  }
}
