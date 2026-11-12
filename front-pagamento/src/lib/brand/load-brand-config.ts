import { existsSync } from 'node:fs'
import path from 'node:path'

import { type BrandConfig, parseBrandConfig, safePublicLogoPath } from '@/lib/brand/brand-config'

const DEFAULT_LOGO = '/brand/logo.svg'

function fileForPublicPath(publicPath: string, publicDir: string): string | null {
  const safe = safePublicLogoPath(publicPath)
  if (!safe) return null
  const root = path.resolve(publicDir)
  const resolved = path.resolve(root, `.${safe}`)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return existsSync(resolved) ? safe : null
}

/** Lê a marca e só entrega logo cujo arquivo existe em `public/`. */
export function loadBrandConfig(publicDir = path.join(process.cwd(), 'public')): BrandConfig {
  const brand = parseBrandConfig(process.env)
  const requested = brand.logoSrc
  const logoSrc = requested
    ? fileForPublicPath(requested, publicDir)
    : fileForPublicPath(DEFAULT_LOGO, publicDir)
  return { ...brand, logoSrc }
}
