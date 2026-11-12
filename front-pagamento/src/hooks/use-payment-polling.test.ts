import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('espera do pagamento', () => {
  it('não abre canal do Supabase e mantém o intervalo de 5 segundos', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'use-payment-polling.ts'),
      'utf8'
    )
    const schema = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../db/migrations/20261109194700_payments_schema.sql'
      ),
      'utf8'
    )
    expect(source).not.toContain('supabase.channel')
    expect(source).toContain('/api/payments/')
    expect(source).toContain('5000')
    expect(schema).not.toContain('PUBLICATION')
  })
})
