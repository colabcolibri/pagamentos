import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    css: false,
    env: {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      ASAAS_WEBHOOK_SECRET: 'test-asaas-webhook-secret',
      PAGARME_WEBHOOK_USER: 'test-pagarme-webhook-user',
      PAGARME_WEBHOOK_SECRET: 'test-pagarme-webhook-secret',
      ASAAS_API_KEY: 'test-asaas-api-key',
      PAGARME_SECRET_KEY: 'test-pagarme-secret-key',
      GEMINI_API_KEY: 'test-gemini-api-key',
      ACCESS_CODE_SECRET: 'test-access-code-secret',
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'src/__mocks__/server-only.ts'),
    },
  },
})
