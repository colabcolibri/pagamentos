import { describe, expect, it } from 'vitest'

import {
  chooseSecret,
  maskSecret,
  publicGatewayAvailability,
  toAdminGatewayView,
} from './gateway-config'
import type { GatewayConfig } from './gateway-config'

describe('chooseSecret', () => {
  it('prefere o ambiente quando os dois existem', () => {
    expect(chooseSecret(' env-key ', 'db-key')).toEqual({ value: 'env-key', source: 'env' })
  })

  it('usa o banco quando o ambiente está vazio', () => {
    expect(chooseSecret('  ', 'db-key')).toEqual({ value: 'db-key', source: 'database' })
  })

  it('marca ausência quando não há valor', () => {
    expect(chooseSecret(null, '   ')).toEqual({ value: null, source: 'missing' })
  })
})

describe('maskSecret', () => {
  it('mostra só as 3 primeiras e as 4 últimas', () => {
    expect(maskSecret('sk_live_abcdefghij')).toBe('sk_…ghij')
  })

  it('não revela um segredo curto', () => {
    expect(maskSecret('curta')).toBe('••••••••')
  })

  it('não devolve nada quando está vazio', () => {
    expect(maskSecret('   ')).toBeNull()
  })
})

describe('publicGatewayAvailability', () => {
  const base: GatewayConfig = {
    saleNotificationRecipients: null,
    asaasEnabled: true,
    pagarmeEnabled: true,
    asaasApiKey: 'SECRET_ASAAS_VALUE',
    asaasApiKeySource: 'database',
    asaasWebhookSecret: null,
    asaasWebhookSecretSource: 'missing',
    asaasEnvironment: 'sandbox',
    asaasEnvironmentSource: 'database',
    pagarmeSecretKey: 'SECRET_PAGARME_VALUE',
    pagarmeSecretKeySource: 'env',
    pagarmeWebhookUser: null,
    pagarmeWebhookUserSource: 'missing',
    pagarmeWebhookSecret: null,
    pagarmeWebhookSecretSource: 'missing',
    pagarmeEnvironment: 'production',
    pagarmeEnvironmentSource: 'missing',
    geminiApiKey: 'SECRET_GEMINI_VALUE',
    geminiApiKeySource: 'database',
    deepinfraApiKey: null,
    deepinfraApiKeySource: 'missing',
    productsByPriceApiKey: null,
    productsByPriceApiKeySource: 'missing',
  }

  it('exige chave e flag para oferecer o gateway', () => {
    expect(publicGatewayAvailability({ ...base, asaasEnabled: false })).toEqual({
      asaas: false,
      pagarme: true,
    })
    expect(publicGatewayAvailability({ ...base, pagarmeSecretKey: null })).toEqual({
      asaas: true,
      pagarme: false,
    })
  })

  it('não inclui o segredo na visão do admin', () => {
    const view = toAdminGatewayView(base)
    expect(JSON.stringify(view)).not.toContain('SECRET_')
    expect(view.asaas_api_key).toEqual({
      configured: true,
      source: 'database',
      preview: 'SEC…ALUE',
    })
    expect(view.pagarme_secret_key).toEqual({
      configured: true,
      source: 'env',
      preview: 'SEC…ALUE',
    })
    expect(view.asaas_webhook_secret.preview).toBeNull()
    expect(JSON.stringify(view)).not.toContain('GEMINI')
    expect(JSON.stringify(view)).not.toContain('PAGARME')
  })
})
