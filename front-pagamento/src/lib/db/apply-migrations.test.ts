import { describe, expect, it } from 'vitest'

import { pendingMigrationFiles } from '../../../scripts/apply-migrations.mjs'

describe('pendingMigrationFiles', () => {
  it('ordena pelo nome e pula o que já foi aplicado', () => {
    const pending = pendingMigrationFiles(
      ['20261109195200_b.sql', 'leia-me.txt', '20261109194700_a.sql'],
      ['20261109194700_a.sql']
    )
    expect(pending).toEqual(['20261109195200_b.sql'])
  })

  it('não reaplica quando todos os arquivos já estão na tabela', () => {
    expect(pendingMigrationFiles(['20261109194700_a.sql'], ['20261109194700_a.sql'])).toEqual([])
  })
})
