import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

import { databaseErrorResponse } from '@/lib/errors/error-handler'

import { closePool, getPool, withTransaction } from './pool'

const here = dirname(fileURLToPath(import.meta.url))

function localDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL
  try {
    const envFile = readFileSync(join(here, '../../../../deploy/postgres/.env'), 'utf8')
    const values = Object.fromEntries(
      envFile
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=')
          return [line.slice(0, index), line.slice(index + 1)]
        })
    )
    const user = values.POSTGRES_USER
    const password = values.POSTGRES_PASSWORD
    const database = values.POSTGRES_DB || 'quitou'
    if (!user || !password) return undefined
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:5435/${database}`
  } catch {
    return undefined
  }
}

const databaseUrl = localDatabaseUrl()

describe('pool do postgres', () => {
  afterAll(async () => {
    await closePool()
  })

  it('o módulo é de servidor e o pool pede no máximo 10 conexões', () => {
    const source = readFileSync(join(here, 'pool.ts'), 'utf8')
    expect(source.startsWith("import 'server-only'")).toBe(true)
    expect(source).toContain('max: MAX_CONNECTIONS')
    expect(source).toContain('const MAX_CONNECTIONS = 10')
    expect(source).not.toContain('NEXT_PUBLIC_DATABASE_URL')
  })

  it('erro de banco não devolve SQL nem host', async () => {
    const response = databaseErrorResponse()
    const body = (await response.json()) as { error: string; details?: unknown }
    expect(body.error).toBe('Erro no banco de dados')
    expect(body.details).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('SELECT')
    expect(JSON.stringify(body)).not.toContain('127.0.0.1')
  })

  it.skipIf(!databaseUrl)('grava duas linhas e desfaz as duas se a segunda falha', async () => {
    process.env.DATABASE_URL = databaseUrl
    const stamp = Date.now()
    const first = `pool-a-${stamp}@quitou.invalid`
    const second = `pool-b-${stamp}@quitou.invalid`

    await withTransaction(async (client) => {
      await client.query('INSERT INTO payments.profiles (email, name) VALUES ($1, $2)', [
        first,
        'Pool A',
      ])
      await client.query('INSERT INTO payments.profiles (email, name) VALUES ($1, $2)', [
        second,
        'Pool B',
      ])
    })

    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO payments.profiles (email, name) VALUES ($1, $2)', [
          `pool-c-${stamp}@quitou.invalid`,
          'Pool C',
        ])
        await client.query('INSERT INTO payments.profiles (email, name) VALUES ($1, $2)', [
          first,
          'Pool duplicado',
        ])
      })
    ).rejects.toThrow()

    const kept = await getPool().query<{ email: string }>(
      'SELECT email FROM payments.profiles WHERE email LIKE $1 ORDER BY email',
      [`pool-%-${stamp}@quitou.invalid`]
    )
    expect(kept.rows.map((row) => row.email)).toEqual([first, second])
    expect(getPool().options.max).toBe(10)

    await getPool().query('DELETE FROM payments.profiles WHERE email LIKE $1', [
      `pool-%-${stamp}@quitou.invalid`,
    ])
  })
})
