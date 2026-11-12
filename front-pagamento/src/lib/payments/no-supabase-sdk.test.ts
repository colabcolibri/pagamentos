import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FORBIDDEN = [
  '@supabase/supabase-js',
  '@supabase/ssr',
  'createAdminSupabaseClient',
  'supabase.auth',
]

function sourceFiles(root: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(root)) {
    if (name === 'node_modules' || name === 'dist' || name === '.next') continue
    const path = join(root, name)
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path))
      continue
    }
    if (/\.(ts|tsx|mjs|js)$/.test(name) && !name.endsWith('.test.ts')) {
      out.push(path)
    }
  }
  return out
}

describe('SDK do Supabase fora do caminho de produção', () => {
  it('não importa o cliente nem a sessão antiga', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const roots = [join(here, '../..'), join(here, '../../../../packages/core/src')]
    const hits: string[] = []
    for (const file of roots.flatMap(sourceFiles)) {
      const text = readFileSync(file, 'utf8')
      for (const token of FORBIDDEN) {
        if (text.includes(token)) hits.push(`${file}: ${token}`)
      }
    }
    expect(hits).toEqual([])
  })
})
