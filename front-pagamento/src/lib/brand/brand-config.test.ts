import { describe, expect, it } from 'vitest'

import { parseBrandConfig } from '@/lib/brand/brand-config'

describe('parseBrandConfig', () => {
  it('usa o nome do produto quando a marca vem vazia e nunca aponta o logo antigo', () => {
    const brand = parseBrandConfig({ BRAND_NAME: '   ', BRAND_LOGO_SRC: '' })

    expect(brand.name).toBe('Quitou')
    expect(brand.logoSrc).toBeNull()
    expect(brand.companyLine).toBeNull()
    expect(brand.links).toEqual([])
  })

  it('monta nome, frase, logo seguro e a linha legal', () => {
    const brand = parseBrandConfig({
      BRAND_NAME: 'Oficina Norte',
      BRAND_TAGLINE: 'Cursos da oficina',
      BRAND_LOGO_SRC: '/brand/oficina.svg',
      BRAND_LEGAL_NAME: 'Oficina Norte LTDA',
      BRAND_CNPJ: '00.000.000/0001-00',
      BRAND_SUPPORT_EMAIL: 'suporte@oficina.example',
      BRAND_PRIVACY_URL: 'https://oficina.example/privacidade',
    })

    expect(brand.name).toBe('Oficina Norte')
    expect(brand.tagline).toBe('Cursos da oficina')
    expect(brand.logoSrc).toBe('/brand/oficina.svg')
    expect(brand.companyLine).toBe('Oficina Norte LTDA — CNPJ 00.000.000/0001-00')
    expect(brand.copyrightName).toBe('Oficina Norte')
    expect(brand.links.map((link) => link.href)).toEqual([
      'https://oficina.example/privacidade',
      'mailto:suporte@oficina.example',
    ])
  })

  it('recusa caminho de logo que sai de public', () => {
    expect(parseBrandConfig({ BRAND_LOGO_SRC: '/logos/../.env' }).logoSrc).toBeNull()
    expect(parseBrandConfig({ BRAND_LOGO_SRC: 'https://cdn.example/logo.svg' }).logoSrc).toBeNull()
  })

  it('omite a linha legal quando só um dos campos existe, e mostra quando há um só', () => {
    expect(parseBrandConfig({ BRAND_LEGAL_NAME: 'Razão' }).companyLine).toBe('Razão')
    expect(parseBrandConfig({ BRAND_CNPJ: '00.000.000/0001-00' }).companyLine).toBe(
      'CNPJ 00.000.000/0001-00'
    )
  })
})
