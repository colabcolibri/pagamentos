import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updatePlatformSettings } from '@/lib/payments/update-platform-settings'

const { query, loadGatewayConfig } = vi.hoisted(() => ({
  query: vi.fn(),
  loadGatewayConfig: vi.fn(),
}))

vi.mock('@/lib/db/pool', () => ({
  getPool: () => ({ query }),
}))
vi.mock('@/lib/payments/gateway-config', () => ({
  loadGatewayConfig,
  toAdminGatewayView: (config: { geminiApiKey?: string | null }) => ({
    gemini: config.geminiApiKey ? { preview: 'SEC…wxyz', configured: true } : { configured: false },
  }),
  maskSecret: (value: string | null) => (value ? 'SEC…wxyz' : null),
}))

describe('configurações no MCP', () => {
  beforeEach(() => {
    query.mockReset()
    loadGatewayConfig.mockResolvedValue({ geminiApiKey: 'SECRET_gemini_key_wxyz' })
  })

  it('campo vazio não grava a coluna e a visão não traz o segredo', async () => {
    const view = await updatePlatformSettings({ gemini_api_key: '   ' })
    expect(query).not.toHaveBeenCalled()
    expect(JSON.stringify(view)).not.toContain('SECRET_')
    expect(JSON.stringify(view)).toContain('SEC…wxyz')
  })
})
