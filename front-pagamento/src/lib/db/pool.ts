import { Pool, type PoolClient } from 'pg'
import 'server-only'

import { serverEnv } from '@/lib/config/env'

const MAX_CONNECTIONS = 10

let pool: Pool | undefined

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: serverEnv.DATABASE_URL,
      max: MAX_CONNECTIONS,
    })
  }
  return pool
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return
  await pool.end()
  pool = undefined
}
