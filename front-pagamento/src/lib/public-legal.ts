import { type BrandConfig, parseBrandConfig } from '@/lib/brand/brand-config'

export type PublicLegalLink = {
  label: string
  href: string
}

export type PublicLegalFooterProps = {
  links: PublicLegalLink[]
  companyLine: string | null
  privacyPolicyHref: string | null
}

/** Rodapé legal a partir da mesma marca da instância. No browser, prefira `useBrand`. */
export function getPublicLegalFooterProps(
  env: Record<string, string | undefined> = process.env
): PublicLegalFooterProps {
  const brand: BrandConfig = parseBrandConfig(env)
  return {
    links: brand.links,
    companyLine: brand.companyLine,
    privacyPolicyHref: brand.privacyUrl,
  }
}
